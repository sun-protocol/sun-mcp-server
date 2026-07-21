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
