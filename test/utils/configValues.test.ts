import { getValueWithPriority, parseOptionalBooleanEnv } from '../../src/utils/configValues'

describe('configuration value precedence', () => {
  it.each([
    [undefined, undefined],
    ['true', true],
    ['false', false],
  ] as const)('parses optional boolean ENV value %p as %p', (input, expected) => {
    expect(parseOptionalBooleanEnv(input, 'DISABLE_X_MCP')).toBe(expected)
  })

  it.each(['', 'TRUE', 'False', '1', 'yes'])('rejects invalid boolean ENV value %p', (input) => {
    expect(() => parseOptionalBooleanEnv(input, 'DISABLE_X_MCP')).toThrow(
      'Invalid DISABLE_X_MCP: expected "true" or "false"',
    )
  })

  it.each([
    { cli: true, env: false, json: false, fallback: false, expected: true },
    { cli: false, env: true, json: true, fallback: true, expected: false },
    { cli: undefined, env: true, json: false, fallback: false, expected: true },
    { cli: undefined, env: false, json: true, fallback: true, expected: false },
    { cli: undefined, env: undefined, json: true, fallback: false, expected: true },
    { cli: undefined, env: undefined, json: false, fallback: true, expected: false },
    { cli: undefined, env: undefined, json: undefined, fallback: true, expected: true },
    { cli: undefined, env: undefined, json: undefined, fallback: false, expected: false },
  ])('resolves CLI > ENV > JSON > default for %#', ({ cli, env, json, fallback, expected }) => {
    expect(getValueWithPriority(cli, env, json, fallback)).toBe(expected)
  })
})
