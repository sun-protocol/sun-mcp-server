import { normalizeMcpPath, getCompatibleMcpPaths } from '../../src/utils/mcpPath'

describe('normalizeMcpPath', () => {
  it('returns default "/" when value is undefined', () => {
    expect(normalizeMcpPath(undefined)).toBe('/')
  })

  it('returns default "/" when value is empty string', () => {
    expect(normalizeMcpPath('')).toBe('/')
  })

  it('returns default "/" when value is whitespace', () => {
    expect(normalizeMcpPath('   ')).toBe('/')
  })

  it('preserves value that starts with /', () => {
    expect(normalizeMcpPath('/custom')).toBe('/custom')
  })

  it('prepends / when value does not start with /', () => {
    expect(normalizeMcpPath('custom')).toBe('/custom')
  })

  it('trims whitespace from value', () => {
    expect(normalizeMcpPath('  /path  ')).toBe('/path')
  })

  it('uses custom default when value is empty', () => {
    expect(normalizeMcpPath(undefined, '/alt')).toBe('/alt')
  })
})

describe('getCompatibleMcpPaths', () => {
  it('returns both "/" and "/mcp" for root path', () => {
    const paths = getCompatibleMcpPaths('/')
    expect(paths).toEqual(new Set(['/', '/mcp']))
  })

  it('returns both "/" and "/mcp" for /mcp path', () => {
    const paths = getCompatibleMcpPaths('/mcp')
    expect(paths).toEqual(new Set(['/', '/mcp']))
  })

  it('returns only the configured path for custom paths', () => {
    const paths = getCompatibleMcpPaths('/custom')
    expect(paths).toEqual(new Set(['/custom']))
  })
})
