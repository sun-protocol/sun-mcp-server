import http from 'http'
import type { AddressInfo } from 'net'
import { startServer, type RunningServer } from '../../src/server'

const getBalances = jest.fn(async () => ({ balances: [] }))

jest.mock('../../src/wallet', () => ({
  initWallet: jest.fn(async () => undefined),
  isWalletConfigured: () => false,
  getWalletAddress: jest.fn(),
}))
jest.mock('@sun-protocol/sun-kit', () => ({
  SunAPI: jest.fn(),
  SunKit: jest.fn().mockImplementation(() => ({ getBalances })),
}))
jest.mock('../../src/config', () => ({
  config: {
    transport: 'streamable-http',
    mcpHost: '127.0.0.1',
    mcpPort: 0,
    mcpPath: '/',
    mcpCorsOrigins: [],
    specConfigs: [{ specPath: 'fixture', overlayPaths: [] }],
  },
}))
jest.mock('../../src/openapiProcessor', () => ({
  getProcessedOpenApi: async () => ({ info: { title: 'Limits', version: '1' }, paths: {} }),
}))
jest.mock('../../src/mcpMapper', () => ({ mapOpenApiToMcpTools: () => [] }))

describe('MCP HTTP input limits', () => {
  let running: RunningServer
  let url: string

  beforeAll(async () => {
    const createServer = jest.spyOn(http, 'createServer')
    running = await startServer()
    const server = createServer.mock.results[0].value as http.Server
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`
    createServer.mockRestore()
  })

  afterAll(async () => running?.close())
  beforeEach(() => getBalances.mockClear())

  async function post(body: unknown) {
    const encoded = JSON.stringify(body)
    return new Promise<{
      status: number | undefined
      text(): Promise<string>
      json(): Promise<any>
    }>((resolve, reject) => {
      const request = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            'Content-Length': Buffer.byteLength(encoded),
          },
        },
        (response) => {
          let text = ''
          response.setEncoding('utf8')
          response.on('data', (chunk) => {
            text += chunk
          })
          response.once('end', () =>
            resolve({
              status: response.statusCode,
              text: async () => text,
              json: async () => JSON.parse(text),
            }),
          )
        },
      )
      request.setTimeout(5000, () => request.destroy(new Error('Request timed out')))
      request.once('error', reject)
      request.end(encoded)
    })
  }

  function balanceCall(tokens: unknown[]) {
    return {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'sunswap_get_balances', arguments: { tokens } },
    }
  }

  it('rejects a request larger than 1 MiB before dispatch', async () => {
    const response = await post({
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
      params: { padding: 'x'.repeat(1024 * 1024) },
    })
    expect(response.status).toBe(413)
    await response.text()
  })

  it('also rejects oversized chunked request bodies', async () => {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const request = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
        },
        (response) => {
          response.resume()
          response.once('end', () => resolve(response.statusCode))
        },
      )
      request.setTimeout(5000, () => request.destroy(new Error('Request timed out')))
      request.on('error', reject)
      request.write('{"jsonrpc":"2.0","id":1,"method":"ping","params":{"padding":"')
      request.write('x'.repeat(1024 * 1024))
      request.end('"}}')
    })
    expect(status).toBe(413)
  })

  it('rejects batches over 100 messages', async () => {
    const response = await post(
      Array.from({ length: 101 }, (_, id) => ({ jsonrpc: '2.0', id, method: 'ping' })),
    )
    expect(response.status).toBe(400)
    expect(await response.text()).toMatch(/batch/i)
  })

  it('rejects oversized valid token collections before the RPC handler runs', async () => {
    const response = await post(balanceCall(Array.from({ length: 10001 }, () => ({ type: 'TRX' }))))
    const message = (await response.json()) as {
      result: { isError?: boolean; content: { text: string }[] }
    }
    expect(message.result.isError).toBe(true)
    expect(message.result.content[0].text).toMatch(/limit|exceed|elements/i)
    expect(getBalances).not.toHaveBeenCalled()
  })

  it('counts nested object keys even when the schema would strip them', async () => {
    const extra = Object.fromEntries(
      Array.from({ length: 10001 }, (_, index) => [String(index), 0]),
    )
    const response = await post(balanceCall([{ type: 'TRX', extra }]))
    const message = (await response.json()) as { result: { isError?: boolean } }
    expect(message.result.isError).toBe(true)
    expect(getBalances).not.toHaveBeenCalled()
  })

  it('preserves ordinary balance calls and tool discovery', async () => {
    const response = await post(balanceCall([{ type: 'TRX' }]))
    const message = (await response.json()) as {
      result: { isError?: boolean; content: { text: string }[] }
    }
    expect(message.result.isError).not.toBe(true)
    expect(JSON.parse(message.result.content[0].text)).toEqual({ balances: [] })
    expect(getBalances).toHaveBeenCalledTimes(1)
    const list = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    const tools = (await list.json()) as { result: { tools: { name: string }[] } }
    expect(tools.result.tools.some((tool) => tool.name === 'sunswap_get_balances')).toBe(true)
  })
})
