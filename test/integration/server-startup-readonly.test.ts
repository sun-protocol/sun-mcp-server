describe('server startup in read-only mode', () => {
  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('starts successfully when wallet resolution fails and initializes SunKit without a wallet', async () => {
    const sunKitCtor = jest.fn().mockImplementation(function SunKitMock(this: any, options: any) {
      this.options = options
    })
    const sunApiCtor = jest.fn().mockImplementation(function SunApiMock(this: any) {
      return this
    })
    const registerSunswapTools = jest.fn()
    const connect = jest.fn(async () => undefined)
    const close = jest.fn(async () => undefined)
    const tool = jest.fn()

    jest.doMock('@bankofai/agent-wallet', () => ({
      resolveWalletProvider: jest.fn(() => {
        throw new Error('wallet unavailable')
      }),
    }))

    jest.doMock('@sun-protocol/sun-kit', () => ({
      SunKit: sunKitCtor,
      SunAPI: sunApiCtor,
      createReadonlyTronWeb: jest.fn(),
    }))

    jest.doMock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
      McpServer: jest.fn().mockImplementation(function McpServerMock(this: any) {
        this.tool = tool
        this.connect = connect
        this.close = close
      }),
    }))

    jest.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: jest.fn().mockImplementation(function StdioServerTransportMock(
        this: any,
      ) {
        return this
      }),
    }))

    jest.doMock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
      StreamableHTTPServerTransport: jest.fn(),
    }))

    jest.doMock('../../src/config', () => ({
      config: {
        transport: 'stdio',
        specConfigs: [
          {
            specPath: '/tmp/test-spec.json',
            overlayPaths: [],
            targetApiBaseUrl: 'https://example.com',
            requestTimeoutMs: 30000,
            customHeaders: {},
            disableXMcp: false,
            filter: { whitelist: null, blacklist: [] },
          },
        ],
      },
    }))

    jest.doMock('../../src/openapiProcessor', () => ({
      getProcessedOpenApi: jest.fn(async () => ({
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      })),
    }))

    jest.doMock('../../src/mcpMapper', () => ({
      mapOpenApiToMcpTools: jest.fn(() => []),
    }))

    jest.doMock('../../src/tools', () => ({
      registerSunswapTools,
    }))

    const { startServer } = await import('../../src/server')

    const runningServer = await startServer()
    expect(sunKitCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet: undefined,
        network: 'mainnet',
      }),
    )
    expect(registerSunswapTools).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        api: expect.anything(),
        kit: expect.anything(),
      }),
    )
    await runningServer.close()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('creates a fresh MCP server per stateless streamable HTTP request', async () => {
    const sunKitCtor = jest.fn().mockImplementation(function SunKitMock(this: any, options: any) {
      this.options = options
    })
    const sunApiCtor = jest.fn().mockImplementation(function SunApiMock(this: any) {
      return this
    })
    const registerSunswapTools = jest.fn()
    const connect = jest.fn(async () => undefined)
    const close = jest.fn(async () => undefined)
    const tool = jest.fn()
    let releaseReadRequest!: () => void
    let releaseWriteRequest!: () => void
    const readRequestGate = new Promise<void>((resolve) => {
      releaseReadRequest = resolve
    })
    const writeRequestGate = new Promise<void>((resolve) => {
      releaseWriteRequest = resolve
    })
    const handleRequest = jest.fn(async (req: any, res: any) => {
      if (req.headers['x-request-kind'] === 'read') await readRequestGate
      if (req.headers['x-request-kind'] === 'write') await writeRequestGate
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })

    let requestHandler: ((req: any, res: any) => Promise<void>) | undefined
    const httpServer: any = {
      on: jest.fn(),
      listen: jest.fn((_port: number, _host: string, callback: () => void) => {
        callback()
        return httpServer
      }),
      close: jest.fn((callback: (error?: Error) => void) => {
        callback()
        return httpServer
      }),
      closeIdleConnections: jest.fn(),
      closeAllConnections: jest.fn(),
    }
    const createServer = jest.fn((handler) => {
      requestHandler = handler
      return httpServer
    })
    const serverConfig = {
      transport: 'streamable-http',
      mcpHost: '127.0.0.1',
      mcpPort: 18080,
      mcpPath: '/',
      mcpCorsOrigins: ['https://allowed.example'],
      specConfigs: [
        {
          specPath: '/tmp/test-spec.json',
          overlayPaths: [],
          targetApiBaseUrl: 'https://example.com',
          requestTimeoutMs: 30000,
          customHeaders: {},
          disableXMcp: false,
          filter: { whitelist: null, blacklist: [] },
        },
      ],
    }

    jest.doMock('http', () => ({
      createServer,
    }))

    jest.doMock('@bankofai/agent-wallet', () => ({
      resolveWalletProvider: jest.fn(() => {
        throw new Error('wallet unavailable')
      }),
    }))

    jest.doMock('@sun-protocol/sun-kit', () => ({
      SunKit: sunKitCtor,
      SunAPI: sunApiCtor,
      createReadonlyTronWeb: jest.fn(),
    }))

    const McpServer = jest.fn().mockImplementation(function McpServerMock(this: any) {
      this.tool = tool
      this.connect = connect
      this.close = close
    })
    jest.doMock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
      McpServer,
    }))

    jest.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: jest.fn(),
    }))

    const StreamableHTTPServerTransport = jest
      .fn()
      .mockImplementation(function StreamableHTTPServerTransportMock(this: any) {
        this.handleRequest = handleRequest
        this.onerror = undefined
      })
    jest.doMock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
      StreamableHTTPServerTransport,
    }))

    jest.doMock('../../src/config', () => ({
      config: serverConfig,
    }))

    jest.doMock('../../src/openapiProcessor', () => ({
      getProcessedOpenApi: jest.fn(async () => ({
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      })),
    }))

    jest.doMock('../../src/mcpMapper', () => ({
      mapOpenApiToMcpTools: jest.fn(() => []),
    }))

    jest.doMock('../../src/tools', () => ({
      registerSunswapTools,
    }))

    const { startServer } = await import('../../src/server')

    const runningServer = await startServer()
    expect(requestHandler).toBeDefined()

    const createResponse = () => {
      const listeners: Record<string, () => void> = {}
      const response: any = {
        headersSent: false,
        writableEnded: false,
        setHeader: jest.fn(),
        once: jest.fn((event: string, listener: () => void) => {
          listeners[event] = listener
          return response
        }),
        writeHead: jest.fn(function (this: any) {
          this.headersSent = true
          return this
        }),
        end: jest.fn(function (this: any) {
          this.writableEnded = true
          listeners.close?.()
          return this
        }),
      }
      return response
    }

    const optionsResponse = createResponse()
    await requestHandler!(
      {
        method: 'OPTIONS',
        url: '/',
        headers: { host: '127.0.0.1:18080', origin: 'https://unknown.example' },
      },
      optionsResponse,
    )

    expect(optionsResponse.writeHead).toHaveBeenCalledWith(403, {
      'Content-Type': 'application/json',
    })
    expect(optionsResponse.setHeader).not.toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      expect.anything(),
    )

    const authorizationPreflightResponse = createResponse()
    await requestHandler!(
      {
        method: 'OPTIONS',
        url: '/',
        headers: {
          host: '127.0.0.1:18080',
          origin: 'https://allowed.example',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Content-Type, Authorization',
        },
      },
      authorizationPreflightResponse,
    )
    expect(authorizationPreflightResponse.writeHead).toHaveBeenCalledWith(204)
    expect(authorizationPreflightResponse.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://allowed.example',
    )
    expect(authorizationPreflightResponse.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      expect.stringContaining('Authorization'),
    )

    const unknownHeaderResponse = createResponse()
    await requestHandler!(
      {
        method: 'OPTIONS',
        url: '/',
        headers: {
          host: '127.0.0.1:18080',
          origin: 'https://allowed.example',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'X-Unknown-Header',
        },
      },
      unknownHeaderResponse,
    )
    expect(unknownHeaderResponse.writeHead).toHaveBeenCalledWith(403, {
      'Content-Type': 'application/json',
    })

    const getResponse = createResponse()
    await requestHandler!(
      { method: 'GET', url: '/', headers: { host: '127.0.0.1:18080' } },
      getResponse,
    )

    expect(getResponse.writeHead).toHaveBeenCalledWith(405, {
      'Content-Type': 'application/json',
    })
    expect(getResponse.setHeader).toHaveBeenCalledWith('Allow', 'POST, OPTIONS')

    await requestHandler!(
      {
        method: 'POST',
        url: '/',
        headers: {
          host: '127.0.0.1:18080',
          origin: 'https://allowed.example',
          authorization: 'Bearer test-token',
        },
      },
      createResponse(),
    )
    await requestHandler!(
      { method: 'POST', url: '/', headers: { host: '127.0.0.1:18080' } },
      createResponse(),
    )
    await requestHandler!(
      { method: 'POST', url: '/mcp', headers: { host: '127.0.0.1:18080' } },
      createResponse(),
    )

    const notFoundResponse = createResponse()
    await requestHandler!(
      { method: 'POST', url: '/other', headers: { host: '127.0.0.1:18080' } },
      notFoundResponse,
    )

    expect(notFoundResponse.writeHead).toHaveBeenCalledWith(404, {
      'Content-Type': 'application/json',
    })
    expect(McpServer).toHaveBeenCalledTimes(3)
    expect(StreamableHTTPServerTransport).toHaveBeenCalledTimes(3)
    expect(StreamableHTTPServerTransport).toHaveBeenNthCalledWith(1, {
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    expect(connect).toHaveBeenCalledTimes(3)
    expect(handleRequest).toHaveBeenCalledTimes(3)
    expect(close).toHaveBeenCalledTimes(3)

    serverConfig.mcpCorsOrigins = ['*']
    const wildcardAuthorizationResponse = createResponse()
    await requestHandler!(
      {
        method: 'OPTIONS',
        url: '/',
        headers: {
          host: '127.0.0.1:18080',
          origin: 'https://browser.example',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Authorization',
        },
      },
      wildcardAuthorizationResponse,
    )
    expect(wildcardAuthorizationResponse.writeHead).toHaveBeenCalledWith(204)
    expect(wildcardAuthorizationResponse.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      '*',
    )
    expect(wildcardAuthorizationResponse.setHeader).not.toHaveBeenCalledWith(
      'Access-Control-Allow-Credentials',
      expect.anything(),
    )

    const cookieCredentialResponse = createResponse()
    await requestHandler!(
      {
        method: 'OPTIONS',
        url: '/',
        headers: {
          host: '127.0.0.1:18080',
          origin: 'https://browser.example',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Cookie',
        },
      },
      cookieCredentialResponse,
    )
    expect(cookieCredentialResponse.writeHead).toHaveBeenCalledWith(403, {
      'Content-Type': 'application/json',
    })

    const readResponse = createResponse()
    const writeResponse = createResponse()
    const readRequest = requestHandler!(
      {
        method: 'POST',
        url: '/',
        headers: { host: '127.0.0.1:18080', 'x-request-kind': 'read' },
      },
      readResponse,
    )
    const writeRequest = requestHandler!(
      {
        method: 'POST',
        url: '/',
        headers: { host: '127.0.0.1:18080', 'x-request-kind': 'write' },
      },
      writeResponse,
    )

    await Promise.resolve()
    expect(runningServer.getInFlightRequestCount()).toBe(2)

    const shutdown = runningServer.close()
    await Promise.resolve()
    expect(httpServer.close).toHaveBeenCalledTimes(1)
    expect(httpServer.closeIdleConnections).toHaveBeenCalledTimes(1)

    const rejectedResponse = createResponse()
    await requestHandler!(
      { method: 'POST', url: '/', headers: { host: '127.0.0.1:18080' } },
      rejectedResponse,
    )
    expect(rejectedResponse.writeHead).toHaveBeenCalledWith(503, {
      'Content-Type': 'application/json',
    })

    releaseReadRequest()
    await readRequest
    expect(runningServer.getInFlightRequestCount()).toBe(1)
    releaseWriteRequest()

    await Promise.all([writeRequest, shutdown])
    expect(runningServer.getInFlightRequestCount()).toBe(0)
    expect(handleRequest).toHaveBeenCalledTimes(5)
    expect(close).toHaveBeenCalledTimes(5)
  })
})
