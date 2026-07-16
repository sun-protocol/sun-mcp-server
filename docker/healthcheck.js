'use strict'

const http = require('node:http')

const host = '127.0.0.1'
const port = Number.parseInt(process.env.MCP_SERVER_PORT || '8080', 10)
const mcpPath = process.env.MCP_SERVER_PATH || '/'
const body = JSON.stringify({
  jsonrpc: '2.0',
  id: 'healthcheck',
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: {
      name: 'docker-healthcheck',
      version: '1.0.0',
    },
  },
})

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
    response.resume()
    process.exit(response.statusCode === 200 ? 0 : 1)
  },
)

request.on('timeout', () => request.destroy(new Error('Healthcheck timed out')))
request.on('error', () => process.exit(1))
request.end(body)
