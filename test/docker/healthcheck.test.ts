import { normalizeMcpPath } from '../../src/utils/mcpPath'

const { LATEST_PROTOCOL_VERSION } = require('@modelcontextprotocol/sdk/types.js')
const {
  HEALTHCHECK_ID,
  createHealthcheckBody,
  isValidHealthcheckResponse,
} = require('../../docker/healthcheck.js')

describe('Docker healthcheck contract', () => {
  it.each([
    ['/', '/'],
    ['/mcp', '/mcp'],
    ['mcp', '/mcp'],
    ['/custom', '/custom'],
  ])('normalizes MCP path %p as %p', (input, expected) => {
    expect(normalizeMcpPath(input)).toBe(expected)
  })

  it('builds initialize requests from the installed MCP SDK protocol version', () => {
    expect(JSON.parse(createHealthcheckBody())).toMatchObject({
      jsonrpc: '2.0',
      id: HEALTHCHECK_ID,
      method: 'initialize',
      params: { protocolVersion: LATEST_PROTOCOL_VERSION },
    })
  })

  it('accepts only a matching initialize result', () => {
    const validResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: HEALTHCHECK_ID,
      result: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        serverInfo: { name: 'SUN.IO API', version: '1.0.0' },
      },
    })

    expect(isValidHealthcheckResponse(200, validResponse)).toBe(true)
    expect(isValidHealthcheckResponse(503, validResponse)).toBe(false)
    expect(isValidHealthcheckResponse(200, 'not-json')).toBe(false)
    expect(isValidHealthcheckResponse(200, JSON.stringify({ id: HEALTHCHECK_ID }))).toBe(false)
    expect(
      isValidHealthcheckResponse(
        200,
        JSON.stringify({
          jsonrpc: '2.0',
          id: 'wrong-id',
          result: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            serverInfo: { name: 'SUN.IO API', version: '1.0.0' },
          },
        }),
      ),
    ).toBe(false)
    expect(
      isValidHealthcheckResponse(
        200,
        JSON.stringify({
          jsonrpc: '2.0',
          id: HEALTHCHECK_ID,
          result: {
            protocolVersion: 'wrong-protocol',
            serverInfo: { name: 'SUN.IO API', version: '1.0.0' },
          },
        }),
      ),
    ).toBe(false)
  })
})
