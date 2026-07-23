'use strict'

const assert = require('node:assert/strict')
const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const packageName = '@sun-protocol/sun-mcp-server'
const repositoryRoot = path.resolve(__dirname, '..')
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sun-mcp-package-'))
const npmCache = process.env.npm_config_cache || path.join(temporaryRoot, 'npm-cache')

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, npm_config_cache: npmCache },
    ...options,
  })
}

try {
  const packResult = JSON.parse(
    run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryRoot]),
  )[0]
  const packagedFiles = packResult.files.map((file) => file.path)

  assert(packagedFiles.includes('dist/index.js'), 'package is missing dist/index.js')
  assert(packagedFiles.includes('dist/index.d.ts'), 'package is missing dist/index.d.ts')
  assert(packagedFiles.includes('dist/cli.js'), 'package is missing dist/cli.js')
  assert(packagedFiles.includes('dist/cli.d.ts'), 'package is missing dist/cli.d.ts')
  assert(
    !packagedFiles.some(
      (file) =>
        file.startsWith('dist/test/') ||
        file.startsWith('dist/scripts/') ||
        file.startsWith('test/') ||
        file.startsWith('scripts/'),
    ),
    'package contains test or development script artifacts',
  )

  const tarballPath = path.join(temporaryRoot, packResult.filename)
  const installDirectory = path.join(temporaryRoot, 'consumer')
  fs.mkdirSync(installDirectory)
  fs.writeFileSync(
    path.join(installDirectory, 'package.json'),
    JSON.stringify({ name: 'sun-mcp-package-smoke', private: true }),
  )
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      tarballPath,
    ],
    { cwd: installDirectory },
  )

  const importResult = spawnSync(
    process.execPath,
    [
      '-e',
      `process.argv.push('--transport', 'invalid'); const api = require('${packageName}'); process.stdout.write(JSON.stringify(Object.keys(api).sort()))`,
    ],
    {
      cwd: installDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        DISABLE_X_MCP: 'invalid-import-must-not-parse-config',
        OPENAPI_SPEC_PATH: '/does/not/exist',
      },
    },
  )
  assert.equal(importResult.status, 0, importResult.stderr)
  assert.equal(importResult.stderr, '', 'package import wrote to stderr')
  assert(JSON.parse(importResult.stdout).includes('normalizeMcpPath'))

  const consumerSource = path.join(installDirectory, 'consumer.ts')
  fs.writeFileSync(
    consumerSource,
    `import { normalizeMcpPath, type ApiClientResponse } from '${packageName}'\nconst result: ApiClientResponse = { success: true, statusCode: 200 }\nconsole.log(normalizeMcpPath('mcp'), result.statusCode)\n`,
  )
  run(
    process.execPath,
    [
      path.join(repositoryRoot, 'node_modules/typescript/bin/tsc'),
      '--strict',
      '--noEmit',
      '--skipLibCheck',
      '--target',
      'ES2020',
      '--module',
      'commonjs',
      '--moduleResolution',
      'node',
      consumerSource,
    ],
    { cwd: installDirectory },
  )

  const handshakeScript = path.join(installDirectory, 'stdio-smoke.cjs')
  fs.writeFileSync(
    handshakeScript,
    `'use strict'
const path = require('node:path')
const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js')

async function main() {
  const client = new Client({ name: 'package-smoke', version: '1.0.0' })
  const transport = new StdioClientTransport({
    command: path.join(process.cwd(), 'node_modules/.bin/sun-mcp-server'),
    cwd: process.cwd(),
    stderr: 'pipe',
  })
  await client.connect(transport)
  const result = await client.listTools()
  if (!Array.isArray(result.tools) || result.tools.length === 0) {
    throw new Error('packaged CLI returned no MCP tools')
  }
  await client.close()
  process.stdout.write(String(result.tools.length))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
`,
  )
  const handshakeResult = spawnSync(process.execPath, [handshakeScript], {
    cwd: installDirectory,
    encoding: 'utf8',
    timeout: 45000,
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        ([key, value]) =>
          typeof value === 'string' &&
          ![
            'CONFIG_FILE',
            'MCP_TRANSPORT',
            'OPENAPI_SPEC_PATH',
            'DISABLE_X_MCP',
          ].includes(key),
      ),
    ),
  })
  assert.equal(handshakeResult.status, 0, handshakeResult.stderr)
  assert(Number.parseInt(handshakeResult.stdout, 10) > 0, 'packaged CLI handshake returned no tools')

  process.stdout.write(
    `Package verified: ${packagedFiles.length} files, ${handshakeResult.stdout.trim()} MCP tools\n`,
  )
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
