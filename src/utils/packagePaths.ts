import fs from 'fs'
import path from 'path'

export function findPackageDirectory(startDirectory: string): string | null {
  let currentDirectory = path.resolve(startDirectory)

  while (true) {
    if (fs.existsSync(path.join(currentDirectory, 'package.json'))) {
      return currentDirectory
    }

    const parentDirectory = path.dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
      return null
    }
    currentDirectory = parentDirectory
  }
}

export function getPackageDirectory(mainModuleFilename = require.main?.filename): string | null {
  const candidates = [
    __dirname,
    mainModuleFilename ? path.dirname(mainModuleFilename) : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of candidates) {
    const packageDirectory = findPackageDirectory(candidate)
    if (packageDirectory) {
      return packageDirectory
    }
  }

  return null
}

export function getConfigPaths(
  workingDirectory = process.cwd(),
  packageDirectory = getPackageDirectory(),
): string[] {
  const configPaths: string[] = []

  if (packageDirectory) {
    configPaths.push(path.join(packageDirectory, 'config.json'))
  }

  configPaths.push(
    path.resolve(workingDirectory, 'openapi-mcp.json'),
    path.resolve(workingDirectory, '.openapi-mcp.json'),
    path.resolve(workingDirectory, 'config.json'),
  )

  return [...new Set(configPaths)]
}
