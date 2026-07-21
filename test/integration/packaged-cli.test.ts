import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getConfigPaths, getPackageDirectory } from '../../src/utils/packagePaths'

const projectRoot = path.resolve(__dirname, '../..')

describe('packaged CLI', () => {
  it('loads the bundled config and OpenAPI spec outside the package directory', () => {
    const packageDirectory = getPackageDirectory()
    const workingDirectory = path.join(os.tmpdir(), 'outside-sun-mcp')
    const configPaths = getConfigPaths(workingDirectory, packageDirectory)

    expect(packageDirectory).toBe(projectRoot)
    expect(configPaths).toEqual([
      path.join(workingDirectory, 'openapi-mcp.json'),
      path.join(workingDirectory, '.openapi-mcp.json'),
      path.join(workingDirectory, 'config.json'),
      path.join(projectRoot, 'config.json'),
    ])

    const bundledConfigPath = configPaths.at(-1)!
    const bundledConfig = JSON.parse(fs.readFileSync(bundledConfigPath, 'utf8'))
    expect(bundledConfig.transport).toBe('stdio')
    expect(path.resolve(path.dirname(bundledConfigPath), bundledConfig.specs[0].spec)).toBe(
      path.join(projectRoot, 'specs/sunio-open-api.json'),
    )
  })

  it('de-duplicates the bundled config when running from the package directory', () => {
    expect(getConfigPaths(projectRoot, projectRoot)).toEqual([
      path.join(projectRoot, 'openapi-mcp.json'),
      path.join(projectRoot, '.openapi-mcp.json'),
      path.join(projectRoot, 'config.json'),
    ])
  })

  it('invokes startServer from the executable bin', () => {
    const packageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sun-mcp-bin-'))
    const binDirectory = path.join(packageDirectory, 'bin')
    const distDirectory = path.join(packageDirectory, 'dist/src')

    fs.mkdirSync(binDirectory, { recursive: true })
    fs.mkdirSync(distDirectory, { recursive: true })
    fs.copyFileSync(
      path.join(projectRoot, 'bin/sun-mcp-server'),
      path.join(binDirectory, 'sun-mcp-server'),
    )
    fs.writeFileSync(
      path.join(distDirectory, 'server.js'),
      "exports.startServer = async () => { process.stdout.write('started'); };\n",
    )

    try {
      const result = spawnSync(process.execPath, [path.join(binDirectory, 'sun-mcp-server')], {
        cwd: os.tmpdir(),
        encoding: 'utf8',
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toBe('started')
    } finally {
      fs.rmSync(packageDirectory, { recursive: true, force: true })
    }
  })
})
