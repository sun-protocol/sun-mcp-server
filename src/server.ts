import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { config } from './config'
import { getProcessedOpenApi } from './openapiProcessor'
import { mapOpenApiToMcpTools } from './mcpMapper'
import { executeApiCall } from './apiClient'
import type { MappedTool, RegisterToolFn } from './types'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { z } from 'zod'
import { registerSunswapTools } from './tools'
import { initWallet, isWalletConfigured, getWallet } from './wallet'
import { SunKit, SunAPI } from '@sun-protocol/sun-kit'

const MCP_ALLOWED_HEADERS =
  'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID'
const MCP_ALLOWED_METHODS = 'POST, OPTIONS'

function getCompatibleMcpPaths(configuredPath: string): ReadonlySet<string> {
  if (configuredPath === '/' || configuredPath === '/mcp') {
    return new Set(['/', '/mcp'])
  }

  return new Set([configuredPath])
}

function applyCorsHeaders(req: IncomingMessage, res: ServerResponse): boolean {
  const requestOrigin = req.headers.origin
  const allowAllOrigins = config.mcpCorsOrigins.includes('*')
  const allowedOrigin = allowAllOrigins
    ? '*'
    : requestOrigin && config.mcpCorsOrigins.includes(requestOrigin)
      ? requestOrigin
      : undefined

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  }
  if (!allowAllOrigins && requestOrigin) {
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', MCP_ALLOWED_METHODS)
  res.setHeader('Access-Control-Allow-Headers', MCP_ALLOWED_HEADERS)
  res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-Id')
  res.setHeader('Access-Control-Max-Age', '86400')

  return !requestOrigin || allowedOrigin !== undefined
}

function writeJsonRpcError(res: ServerResponse, statusCode: number, message: string): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message,
      },
      id: null,
    }),
  )
}

function createMcpServer(
  primarySpec: any,
  mappedTools: MappedTool[],
  deps: { api: SunAPI; kit: SunKit },
  logRegistrations = true,
) {
  const server = new McpServer({
    name:
      config.specConfigs.length > 1
        ? 'OpenAPI to MCP Generator (Multi-Spec)'
        : primarySpec.info?.title || 'OpenAPI to MCP Generator',
    version: primarySpec.info?.version || '1.0.0',
  })

  const registeredToolNames = new Set<string>()
  const registerTool: RegisterToolFn = (name, definition, handler) => {
    if (registeredToolNames.has(name)) {
      console.error(
        `Skipping duplicate tool name: ${name}. Use 'toolPrefix' in specs config to avoid collisions.`,
      )
      return
    }
    registeredToolNames.add(name)

    try {
      const paramsSchema = (definition.inputSchema || {}) as z.ZodRawShape
      if (definition.description) {
        ;(server.tool as any)(name, definition.description, paramsSchema, async (toolParams: any) =>
          handler(toolParams),
        )
      } else {
        ;(server.tool as any)(name, paramsSchema, async (toolParams: any) => handler(toolParams))
      }
      if (logRegistrations) {
        console.error(`Registered Tool: ${name}`)
      }
    } catch (registerError) {
      console.error(`Failed to register tool ${name}:`, registerError)
    }
  }

  registerSunswapTools(registerTool, deps)

  for (const tool of mappedTools) {
    const { mcpToolDefinition, apiCallDetails } = tool
    if (logRegistrations) {
      console.error(`Registering MCP tool: ${mcpToolDefinition.name}`)
    }

    try {
      const params: any = {}

      if (mcpToolDefinition.inputSchema && mcpToolDefinition.inputSchema.properties) {
        for (const [propName, propSchema] of Object.entries(
          mcpToolDefinition.inputSchema.properties,
        )) {
          if (typeof propSchema !== 'object') continue

          const description = (propSchema.description as string) || `Parameter: ${propName}`
          const required = mcpToolDefinition.inputSchema.required?.includes(propName) || false

          let zodSchema
          const schemaType = Array.isArray(propSchema.type) ? propSchema.type[0] : propSchema.type

          switch (schemaType) {
            case 'integer':
              zodSchema = z.number().int().describe(description)
              break
            case 'number':
              zodSchema = z.number().describe(description)
              break
            case 'boolean':
              zodSchema = z.boolean().describe(description)
              break
            case 'object':
              zodSchema = z.object({}).passthrough().describe(description)
              break
            case 'array':
              zodSchema = z.array(z.any()).describe(description)
              break
            case 'string':
            default:
              zodSchema = z.string().describe(description)
              break
          }

          params[propName] = required ? zodSchema : zodSchema.optional()
        }
      }

      registerTool(
        mcpToolDefinition.name,
        {
          inputSchema: params,
          description: mcpToolDefinition.description,
          annotations: {
            title: mcpToolDefinition.name,
          },
        },
        async (toolParams: any) => {
          try {
            const result = await executeApiCall(apiCallDetails, toolParams)

            if (result.success) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result.data),
                  },
                ],
              }
            } else {
              let errorCode = ErrorCode.InternalError
              let errorMessage = result.error || `API Error ${result.statusCode}`

              if (result.statusCode === 400) {
                errorCode = ErrorCode.InvalidParams
                errorMessage = `Invalid parameters: ${result.error}`
              } else if (result.statusCode === 404) {
                errorCode = ErrorCode.InvalidParams
                errorMessage = `Resource not found: ${result.error}`
              }

              throw new McpError(errorCode, errorMessage, result.data)
            }
          } catch (invocationError: any) {
            if (invocationError instanceof McpError) {
              throw invocationError
            }
            throw new McpError(
              ErrorCode.InternalError,
              `Internal server error: ${invocationError.message}`,
            )
          }
        },
      )
    } catch (registerError) {
      console.error(`Failed to register tool ${mcpToolDefinition.name}:`, registerError)
    }
  }

  return server
}

async function startServer() {
  console.error('Starting Dynamic OpenAPI MCP Server...')

  const openapiSpecs: any[] = []
  let mappedTools: MappedTool[] = []
  try {
    for (const [index, specCfg] of config.specConfigs.entries()) {
      console.error(
        `Loading spec [${index + 1}/${config.specConfigs.length}] from: ${specCfg.specPath}`,
      )
      const openapiSpec = await getProcessedOpenApi(specCfg)
      openapiSpecs.push(openapiSpec)

      const mapped = mapOpenApiToMcpTools(openapiSpec, {
        targetApiBaseUrl: specCfg.targetApiBaseUrl,
        requestTimeoutMs: specCfg.requestTimeoutMs,
        customHeaders: specCfg.customHeaders,
        disableXMcp: specCfg.disableXMcp,
        filter: specCfg.filter,
        toolPrefix: specCfg.toolPrefix,
      })
      mappedTools = mappedTools.concat(mapped)
    }
  } catch (error) {
    console.error(
      'Failed to initialize/mapping OpenAPI specifications. Server cannot start.',
      error,
    )
    process.exit(1)
  }

  if (mappedTools.length === 0) {
    console.error(
      'No tools were mapped from the configured specs based on current configuration/filtering.',
    )
  }
  if (openapiSpecs.length === 0) {
    console.error('No OpenAPI specs available after processing. Server cannot start.')
    process.exit(1)
  }

  const primarySpec = openapiSpecs[0]

  if (primarySpec.info?.description) {
    console.error(`API Description: ${primarySpec.info.description}`)
  }

  // Initialize global wallet singleton (agent-wallet > local > read-only)
  await initWallet()

  // Create SunKit / SunAPI instances
  const api = new SunAPI()
  const kit = new SunKit({
    wallet: isWalletConfigured() ? getWallet() : undefined,
    network: process.env.TRON_NETWORK || 'mainnet',
    tronGridApiKey: process.env.TRON_GRID_API_KEY,
    rpcUrl: process.env.TRON_RPC_URL,
  })

  console.error('Starting MCP server...')

  try {
    if (config.transport === 'streamable-http') {
      const compatibleMcpPaths = getCompatibleMcpPaths(config.mcpPath)
      const httpServer = createServer(async (req, res) => {
        try {
          const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
          if (!compatibleMcpPaths.has(requestUrl.pathname)) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Not found' }))
            return
          }

          if (!applyCorsHeaders(req, res)) {
            writeJsonRpcError(res, 403, 'Forbidden: Origin is not allowed')
            return
          }

          if (req.method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
          }

          if (req.method !== 'POST') {
            res.setHeader('Allow', MCP_ALLOWED_METHODS)
            writeJsonRpcError(res, 405, 'Method not allowed.')
            return
          }

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
          })
          const server = createMcpServer(primarySpec, mappedTools, { api, kit }, false)

          transport.onerror = (transportError: Error) => {
            console.error('MCP transport error:', transportError)
          }

          let cleanupStarted = false
          res.once('close', () => {
            if (cleanupStarted) return
            cleanupStarted = true

            void server.close().catch((closeError: unknown) => {
              console.error('Failed to close per-request MCP server:', closeError)
            })
          })

          await server.connect(transport)
          await transport.handleRequest(req, res)
        } catch (requestError: any) {
          console.error('Error handling HTTP MCP request:', requestError)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
          }
          res.end(JSON.stringify({ error: 'Internal server error' }))
        }
      })

      await new Promise<void>((resolve, reject) => {
        httpServer.on('error', reject)
        httpServer.listen(config.mcpPort, config.mcpHost, () => resolve())
      })

      console.error(`MCP Server started and ready for connections`)
      console.error(
        `Listening on ${Array.from(compatibleMcpPaths)
          .map((mcpPath) => `http://${config.mcpHost}:${config.mcpPort}${mcpPath}`)
          .join(', ')}`,
      )
      return
    }

    const server = createMcpServer(primarySpec, mappedTools, { api, kit })
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error(`MCP Server started and ready for connections`)
  } catch (error) {
    console.error('Error starting MCP server:', error)
    process.exit(1)
  }
}

export { startServer }

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Unhandled error during server startup:', error)
    process.exit(1)
  })
}
