import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getConfigPaths, getPackageDirectory } from '../../src/utils/packagePaths'

const projectRoot = path.resolve(__dirname, '../..')

describe('packaged CLI', () => {
  it('loads the bundled config and OpenAPI spec outside the package directory', () => {
    const packageDirectory = getPackageDirectory()
    const configPaths = getConfigPaths(path.join(os.tmpdir(), 'outside-sun-mcp'), packageDirectory)

    expect(packageDirectory).toBe(projectRoot)
    expect(configPaths[0]).toBe(path.join(projectRoot, 'config.json'))

    const bundledConfig = JSON.parse(fs.readFileSync(configPaths[0], 'utf8'))
    expect(path.resolve(path.dirname(configPaths[0]), bundledConfig.specs[0].spec)).toBe(
      path.join(projectRoot, 'specs/sunio-open-api.json'),
    )
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
