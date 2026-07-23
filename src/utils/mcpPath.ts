export function normalizeMcpPath(value: string | undefined, defaultPath = '/'): string {
  const normalized = value?.trim() || defaultPath
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function getCompatibleMcpPaths(configuredPath: string): ReadonlySet<string> {
  if (configuredPath === '/' || configuredPath === '/mcp') {
    return new Set(['/', '/mcp'])
  }

  return new Set([configuredPath])
}
