import path from 'path'
import {
  getValueWithPriority,
  parseOptionalBooleanEnv,
  selectScopedConfigValue,
} from '../../src/utils/configValues'

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

describe('per-spec configuration inheritance', () => {
  const configDirectory = '/package/config'
  const runtimeDirectory = '/runtime/cwd'

  it.each([
    { label: 'missing', scoped: undefined, expectedValue: 'global.yaml', inherited: true },
    { label: 'null', scoped: null, expectedValue: 'global.yaml', inherited: true },
    { label: 'empty string', scoped: '', expectedValue: '', inherited: false },
    { label: 'empty array', scoped: [], expectedValue: [], inherited: false },
    { label: 'string', scoped: 'spec.yaml', expectedValue: 'spec.yaml', inherited: false },
    {
      label: 'array',
      scoped: ['first.yaml', 'second.yaml'],
      expectedValue: ['first.yaml', 'second.yaml'],
      inherited: false,
    },
  ])(
    'uses the correct path base for a $label per-spec overlay',
    ({ scoped, expectedValue, inherited }) => {
      const selected = selectScopedConfigValue(
        scoped,
        'global.yaml',
        configDirectory,
        runtimeDirectory,
      )

      expect(selected.value).toEqual(expectedValue)
      expect(selected.baseDirectory).toBe(inherited ? runtimeDirectory : configDirectory)
    },
  )

  it.each([
    ['CLI', runtimeDirectory],
    ['ENV', runtimeDirectory],
    ['JSON', configDirectory],
  ])('inherits global %s overlays using their source directory', (_source, globalBaseDirectory) => {
    const selected = selectScopedConfigValue(
      null,
      'overlays/global.yaml',
      configDirectory,
      globalBaseDirectory,
    )

    expect(path.resolve(selected.baseDirectory, selected.value)).toBe(
      path.join(globalBaseDirectory, 'overlays/global.yaml'),
    )
  })
})
