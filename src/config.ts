import dotenv from 'dotenv'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import { isHttpUrl } from './utils/httpClient'
import { getConfigPaths, getPackageDirectory } from './utils/packagePaths'
import { safeUrlForLogging } from './utils/logging'
import {
  getValueWithPriority,
  parseOptionalBooleanEnv,
  selectScopedConfigValue,
} from './utils/configValues'
import { normalizeMcpPath } from './utils/mcpPath'

dotenv.config()

export type TransportMode = 'stdio' | 'streamable-http'

export interface SpecConfig {
  name?: string
  specPath: string
  overlayPaths: string[]
  targetApiBaseUrl?: string
  requestTimeoutMs: number
  customHeaders: Record<string, string>
  disableXMcp: boolean
  filter: {
    whitelist: string[] | null
    blacklist: string[]
  }
  toolPrefix?: string
}

const argv = yargs(hideBin(process.argv))
  .option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to JSON configuration file',
  })
  .option('spec', {
    alias: 's',
    type: 'string',
    description: 'Path to the OpenAPI specification file',
  })
  .option('overlays', {
    alias: 'o',
    type: 'string',
    description: 'Comma-separated paths to OpenAPI overlay files',
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    description: 'Port for the MCP server',
  })
  .option('host', {
    type: 'string',
    description: 'Host for streamable HTTP MCP server',
  })
  .option('mcpPath', {
    type: 'string',
    description:
      'HTTP path for streamable HTTP MCP endpoint; / and /mcp are served as compatible aliases',
  })
  .option('corsOrigins', {
    type: 'string',
    description:
      'Comma-separated allowed origins for streamable HTTP CORS; leave empty to deny browser origins',
  })
  .option('transport', {
    type: 'string',
    choices: ['stdio', 'streamable-http'],
    description: 'MCP transport mode',
  })
  .option('targetUrl', {
    alias: 'u',
    type: 'string',
    description: 'Target API base URL (overrides OpenAPI servers)',
  })
  .option('timeout', {
    type: 'number',
    description: 'Timeout for outbound target API requests in milliseconds',
  })
  .option('whitelist', {
    alias: 'w',
    type: 'string',
    description: 'Comma-separated operationIds or URL paths to include (supports glob patterns)',
  })
  .option('blacklist', {
    alias: 'b',
    type: 'string',
    description:
      'Comma-separated operationIds or URL paths to exclude (supports glob patterns, ignored if whitelist used)',
  })
  .option('apiKey', {
    type: 'string',
    description: 'API Key for the target API',
  })
  .option('securitySchemeName', {
    type: 'string',
    description: 'Name of the security scheme requiring the API Key',
  })
  .option('securityCredentials', {
    type: 'string',
    description: 'JSON string containing security credentials for multiple schemes',
  })
  .option('headers', {
    type: 'string',
    description: 'JSON string containing custom headers to include in all API requests',
  })
  .option('disableXMcp', {
    type: 'boolean',
    description: 'Disable adding X-MCP: 1 header to all API requests',
  })
  .help()
  .parseSync()

const customHeadersFromEnv: Record<string, string> = {}
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('HEADER_')) {
    const headerName = key.substring(7)
    customHeadersFromEnv[headerName] = process.env[key] || ''
  }
})

function loadJsonConfig(configPath: string): Record<string, any> {
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8')
      const parsed = JSON.parse(configContent)
      console.error(`Loaded configuration from ${configPath}`)
      return parsed
    }
  } catch (error) {
    console.error(`Error loading JSON config from ${configPath}:`, error)
  }
  return {}
}

let jsonConfig: Record<string, any> = {}
let loadedConfigPath: string | null = null
if (argv.config) {
  const configPath = path.resolve(process.cwd(), argv.config)
  jsonConfig = loadJsonConfig(configPath)
  loadedConfigPath = Object.keys(jsonConfig).length > 0 ? configPath : null
} else if (process.env.CONFIG_FILE) {
  const configPath = path.resolve(process.cwd(), process.env.CONFIG_FILE)
  jsonConfig = loadJsonConfig(configPath)
  loadedConfigPath = Object.keys(jsonConfig).length > 0 ? configPath : null
} else {
  const packageDirectory = getPackageDirectory()
  if (packageDirectory) {
    console.error(`Bundled config fallback: ${path.join(packageDirectory, 'config.json')}`)
  }
  const configPaths = getConfigPaths()
  for (const configPath of configPaths) {
    const cfg = loadJsonConfig(configPath)
    if (Object.keys(cfg).length > 0) {
      jsonConfig = cfg
      loadedConfigPath = configPath
      break
    }
  }
}

const configBaseDirectory = loadedConfigPath ? path.dirname(loadedConfigPath) : process.cwd()

const parsePatternList = (value: unknown): string[] | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  return null
}

const parseHeaders = (input: unknown): Record<string, string> => {
  if (!input) return {}
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object') {
        const normalized: Record<string, string> = {}
        Object.entries(parsed).forEach(([k, v]) => {
          normalized[k] = String(v)
        })
        return normalized
      }
    } catch (error) {
      console.error('Failed to parse headers JSON:', error)
    }
    return {}
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    const normalized: Record<string, string> = {}
    Object.entries(input as Record<string, any>).forEach(([k, v]) => {
      normalized[k] = String(v)
    })
    return normalized
  }

  return {}
}

const resolveSpecPath = (value: string, baseDirectory: string): string =>
  isHttpUrl(value) ? value : path.resolve(baseDirectory, value)
const resolvePathList = (input: unknown, baseDirectory: string): string[] => {
  const raw = parsePatternList(input)
  if (!raw) return []
  return raw.map((p) => (isHttpUrl(p) ? p : path.resolve(baseDirectory, p)))
}

const envValues = {
  specPath: process.env.OPENAPI_SPEC_PATH,
  overlays: process.env.OPENAPI_OVERLAY_PATHS,
  port: process.env.MCP_SERVER_PORT ? parseInt(process.env.MCP_SERVER_PORT, 10) : undefined,
  host: process.env.MCP_SERVER_HOST,
  mcpPath: process.env.MCP_SERVER_PATH,
  corsOrigins: process.env.MCP_CORS_ORIGINS,
  transport: process.env.MCP_TRANSPORT as TransportMode | undefined,
  targetUrl: process.env.TARGET_API_BASE_URL,
  timeout: process.env.TARGET_API_TIMEOUT_MS
    ? parseInt(process.env.TARGET_API_TIMEOUT_MS, 10)
    : undefined,
  whitelist: process.env.MCP_WHITELIST_OPERATIONS,
  blacklist: process.env.MCP_BLACKLIST_OPERATIONS,
  apiKey: process.env.API_KEY,
  securitySchemeName: process.env.SECURITY_SCHEME_NAME,
  securityCredentials: process.env.SECURITY_CREDENTIALS,
  headers: process.env.CUSTOM_HEADERS,
  disableXMcp: parseOptionalBooleanEnv(process.env.DISABLE_X_MCP, 'DISABLE_X_MCP'),
}

const specPath = getValueWithPriority(argv.spec, envValues.specPath, jsonConfig.spec, '')
const overlays = getValueWithPriority(argv.overlays, envValues.overlays, jsonConfig.overlays, '')
const specPathBaseDirectory =
  argv.spec !== undefined || envValues.specPath !== undefined ? process.cwd() : configBaseDirectory
const overlaysBaseDirectory =
  argv.overlays !== undefined || envValues.overlays !== undefined
    ? process.cwd()
    : configBaseDirectory
const port = getValueWithPriority(argv.port, envValues.port, jsonConfig.port, 8080)
const host = getValueWithPriority(argv.host, envValues.host, jsonConfig.host, '127.0.0.1')
const mcpPathRaw = getValueWithPriority(argv.mcpPath, envValues.mcpPath, jsonConfig.mcpPath, '/')
const corsOriginsRaw = getValueWithPriority(
  argv.corsOrigins,
  envValues.corsOrigins,
  jsonConfig.corsOrigins,
  '',
)
const mcpCorsOrigins = parsePatternList(corsOriginsRaw) ?? []
const transport = getValueWithPriority(
  argv.transport as TransportMode | undefined,
  envValues.transport,
  jsonConfig.transport as TransportMode | undefined,
  'stdio',
)
const targetUrl = getValueWithPriority(
  argv.targetUrl,
  envValues.targetUrl,
  jsonConfig.targetUrl,
  '',
)
const requestTimeoutMs = getValueWithPriority(
  argv.timeout,
  envValues.timeout,
  jsonConfig.timeout,
  30000,
)
const whitelist = getValueWithPriority(
  argv.whitelist,
  envValues.whitelist,
  jsonConfig.whitelist,
  '',
)
const blacklist = getValueWithPriority(
  argv.blacklist,
  envValues.blacklist,
  jsonConfig.blacklist,
  '',
)
const apiKey = getValueWithPriority(argv.apiKey, envValues.apiKey, jsonConfig.apiKey, '')
const securitySchemeName = getValueWithPriority(
  argv.securitySchemeName,
  envValues.securitySchemeName,
  jsonConfig.securitySchemeName,
  '',
)

const hasMultiSpecsInJson = Array.isArray(jsonConfig.specs) && jsonConfig.specs.length > 0
if (!specPath && !hasMultiSpecsInJson) {
  console.error(
    'Error: OpenAPI specification path is required. Set OPENAPI_SPEC_PATH environment variable, use --spec option, or specify in config file.',
  )
  process.exit(1)
}

let securityCredentials: Record<string, string> = {}
if (argv.securityCredentials) {
  try {
    securityCredentials = JSON.parse(argv.securityCredentials)
  } catch (e) {
    console.error('Failed to parse security credentials JSON from CLI:', e)
  }
} else if (envValues.securityCredentials) {
  try {
    securityCredentials = JSON.parse(envValues.securityCredentials)
  } catch (e) {
    console.error('Failed to parse security credentials JSON from ENV:', e)
  }
} else if (jsonConfig.securityCredentials) {
  if (typeof jsonConfig.securityCredentials === 'string') {
    try {
      securityCredentials = JSON.parse(jsonConfig.securityCredentials)
    } catch (e) {
      console.error('Failed to parse security credentials JSON from config file:', e)
    }
  } else if (typeof jsonConfig.securityCredentials === 'object') {
    securityCredentials = jsonConfig.securityCredentials
  }
}

let customHeaders: Record<string, string> = { ...customHeadersFromEnv }
if (argv.headers) {
  customHeaders = { ...customHeaders, ...parseHeaders(argv.headers) }
} else if (envValues.headers) {
  customHeaders = { ...customHeaders, ...parseHeaders(envValues.headers) }
} else if (jsonConfig.headers) {
  customHeaders = { ...customHeaders, ...parseHeaders(jsonConfig.headers) }
}

const disableXMcp = getValueWithPriority(
  argv.disableXMcp,
  envValues.disableXMcp,
  typeof jsonConfig.disableXMcp === 'boolean' ? jsonConfig.disableXMcp : undefined,
  false,
)

const globalWhitelistPatterns = parsePatternList(whitelist)
const globalBlacklistPatterns = parsePatternList(blacklist) || []

const resolvedSpecConfigs: SpecConfig[] = hasMultiSpecsInJson
  ? jsonConfig.specs
      .filter(
        (specEntry: any) =>
          specEntry && typeof specEntry.spec === 'string' && specEntry.spec.trim(),
      )
      .map((specEntry: any): SpecConfig => {
        const perSpecHeaders = parseHeaders(specEntry.headers)
        const selectedOverlays = selectScopedConfigValue(
          specEntry.overlays,
          overlays,
          configBaseDirectory,
          overlaysBaseDirectory,
        )
        const perSpecTimeout =
          typeof specEntry.timeout === 'number' ? specEntry.timeout : requestTimeoutMs
        const perSpecDisableXMcp =
          typeof specEntry.disableXMcp === 'boolean' ? specEntry.disableXMcp : disableXMcp

        return {
          name: typeof specEntry.name === 'string' ? specEntry.name.trim() : undefined,
          specPath: resolveSpecPath(specEntry.spec.trim(), configBaseDirectory),
          overlayPaths: resolvePathList(selectedOverlays.value, selectedOverlays.baseDirectory),
          targetApiBaseUrl:
            typeof specEntry.targetUrl === 'string' && specEntry.targetUrl.trim()
              ? specEntry.targetUrl.trim()
              : targetUrl || undefined,
          requestTimeoutMs: perSpecTimeout,
          customHeaders: { ...customHeaders, ...perSpecHeaders },
          disableXMcp: perSpecDisableXMcp,
          filter: {
            whitelist: parsePatternList(specEntry.whitelist) ?? globalWhitelistPatterns,
            blacklist: parsePatternList(specEntry.blacklist) ?? globalBlacklistPatterns,
          },
          toolPrefix: typeof specEntry.toolPrefix === 'string' ? specEntry.toolPrefix : undefined,
        }
      })
  : [
      {
        specPath: resolveSpecPath(specPath, specPathBaseDirectory),
        overlayPaths: resolvePathList(overlays, overlaysBaseDirectory),
        targetApiBaseUrl: targetUrl || undefined,
        requestTimeoutMs,
        customHeaders,
        disableXMcp,
        filter: {
          whitelist: globalWhitelistPatterns,
          blacklist: globalBlacklistPatterns,
        },
      },
    ]

if (resolvedSpecConfigs.length === 0) {
  console.error(
    "Error: No valid spec entries found. Provide 'spec' or at least one valid item in 'specs'.",
  )
  process.exit(1)
}

export const config = {
  specPath: resolvedSpecConfigs[0].specPath,
  overlayPaths: resolvedSpecConfigs[0].overlayPaths,
  specConfigs: resolvedSpecConfigs,
  mcpPort: port,
  mcpHost: host,
  mcpPath: normalizeMcpPath(mcpPathRaw),
  mcpCorsOrigins,
  transport,
  targetApiBaseUrl: resolvedSpecConfigs[0].targetApiBaseUrl || '',
  requestTimeoutMs: resolvedSpecConfigs[0].requestTimeoutMs,
  apiKey,
  securitySchemeName,
  securityCredentials,
  customHeaders: resolvedSpecConfigs[0].customHeaders,
  disableXMcp: resolvedSpecConfigs[0].disableXMcp,
  filter: {
    whitelist: resolvedSpecConfigs[0].filter.whitelist,
    blacklist: resolvedSpecConfigs[0].filter.blacklist,
  },
}

console.error('Configuration loaded:')
if (config.specConfigs.length > 1) {
  console.error(`- OpenAPI Specs: ${config.specConfigs.length} entries`)
  config.specConfigs.forEach((specCfg, idx) => {
    console.error(`  [${idx + 1}] Spec: ${specCfg.specPath}`)
    if (specCfg.overlayPaths.length > 0) {
      console.error(`      Overlays: ${specCfg.overlayPaths.join(', ')}`)
    }
    if (specCfg.targetApiBaseUrl) {
      console.error(`      Target API Base URL: ${safeUrlForLogging(specCfg.targetApiBaseUrl)}`)
    }
    console.error(`      Timeout: ${specCfg.requestTimeoutMs}ms`)
    if (Object.keys(specCfg.customHeaders).length > 0) {
      console.error(`      Headers: ${Object.keys(specCfg.customHeaders).join(', ')}`)
    }
    if (specCfg.filter.whitelist) {
      console.error(`      Whitelist: ${specCfg.filter.whitelist.join(', ')}`)
    } else if (specCfg.filter.blacklist.length > 0) {
      console.error(`      Blacklist: ${specCfg.filter.blacklist.join(', ')}`)
    }
  })
} else {
  console.error(`- OpenAPI Spec: ${config.specPath}`)
  if (config.overlayPaths.length > 0) {
    console.error(`- Overlays: ${config.overlayPaths.join(', ')}`)
  }
}
console.error(`- MCP Server Port: ${config.mcpPort}`)
console.error(`- MCP Transport: ${config.transport}`)
if (config.transport === 'streamable-http') {
  console.error(`- MCP HTTP Endpoint: http://${config.mcpHost}:${config.mcpPort}${config.mcpPath}`)
  console.error(`- MCP CORS Origins: ${config.mcpCorsOrigins.join(', ') || '(disabled)'}`)
}
if (config.targetApiBaseUrl) {
  console.error(`- Target API Base URL: ${safeUrlForLogging(config.targetApiBaseUrl)}`)
} else {
  console.error(`- Target API Base URL: Will use 'servers' from OpenAPI spec.`)
}
console.error(`- Target API Timeout: ${config.requestTimeoutMs}ms`)
if (Object.keys(config.customHeaders).length > 0) {
  console.error(`- Custom Headers: ${Object.keys(config.customHeaders).join(', ')}`)
}
console.error(`- X-MCP Header: ${config.disableXMcp ? 'Disabled' : 'Enabled'}`)
