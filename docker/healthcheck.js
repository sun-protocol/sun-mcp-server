'use strict'

const http = require('node:http')
const { LATEST_PROTOCOL_VERSION } = require('@modelcontextprotocol/sdk/types.js')
const { normalizeMcpPath } = require('../dist/utils/mcpPath.js')

const host = '127.0.0.1'
const port = Number.parseInt(process.env.MCP_SERVER_PORT || '8080', 10)
const mcpPath = normalizeMcpPath(process.env.MCP_SERVER_PATH)
const HEALTHCHECK_ID = 'healthcheck'
const MAX_RESPONSE_BYTES = 64 * 1024

function createHealthcheckBody() {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: HEALTHCHECK_ID,
    method: 'initialize',
    params: {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'docker-healthcheck',
        version: '1.0.0',
      },
    },
  })
}

function isValidHealthcheckResponse(statusCode, responseBody) {
  if (statusCode !== 200) return false

  try {
    const payload = JSON.parse(responseBody)
    return (
      payload?.jsonrpc === '2.0' &&
      payload?.id === HEALTHCHECK_ID &&
      payload?.result?.protocolVersion === LATEST_PROTOCOL_VERSION &&
      typeof payload?.result?.serverInfo?.name === 'string' &&
      typeof payload?.result?.serverInfo?.version === 'string'
    )
  } catch {
    return false
  }
}

function runHealthcheck(exit = process.exit) {
  const body = createHealthcheckBody()
  let settled = false
  const finish = (healthy) => {
    if (settled) return
    settled = true
    exit(healthy ? 0 : 1)
  }

  const request = http.request(
    {
      host,
      port,
      path: mcpPath,
      method: 'POST',
      timeout: 4000,
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    (response) => {
      const chunks = []
      let receivedBytes = 0

      response.on('data', (chunk) => {
        receivedBytes += chunk.length
        if (receivedBytes > MAX_RESPONSE_BYTES) {
          request.destroy(new Error('Healthcheck response exceeded maximum size'))
          return
        }
        chunks.push(chunk)
      })
      response.on('end', () => {
        finish(
          isValidHealthcheckResponse(
            response.statusCode,
            Buffer.concat(chunks).toString('utf8'),
          ),
        )
      })
    },
  )

  request.on('timeout', () => request.destroy(new Error('Healthcheck timed out')))
  request.on('error', () => finish(false))
  request.end(body)
}

module.exports = {
  HEALTHCHECK_ID,
  createHealthcheckBody,
  isValidHealthcheckResponse,
  runHealthcheck,
}

if (require.main === module) {
  runHealthcheck()
}
