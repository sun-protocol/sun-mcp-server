export function getValueWithPriority<T>(
  cliValue: T | undefined,
  envValue: T | undefined,
  configValue: T | undefined,
  defaultValue: T,
): T {
  if (cliValue !== undefined) return cliValue
  if (envValue !== undefined) return envValue
  if (configValue !== undefined) return configValue
  return defaultValue
}

export function parseOptionalBooleanEnv(
  value: string | undefined,
  variableName: string,
): boolean | undefined {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false

  throw new Error(`Invalid ${variableName}: expected "true" or "false"`)
}

export function selectScopedConfigValue<T>(
  scopedValue: T | null | undefined,
  inheritedValue: T,
  scopedBaseDirectory: string,
  inheritedBaseDirectory: string,
): { value: T; baseDirectory: string } {
  const hasScopedValue = scopedValue !== null && scopedValue !== undefined
  return hasScopedValue
    ? { value: scopedValue, baseDirectory: scopedBaseDirectory }
    : { value: inheritedValue, baseDirectory: inheritedBaseDirectory }
}
