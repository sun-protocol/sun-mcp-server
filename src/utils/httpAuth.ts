import { createHash, timingSafeEqual } from 'crypto'

const SENSITIVE_OUTBOUND_HEADER_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'x-api-key',
  'api-key',
  'x-auth-token',
])

export function parseAuthTokens(input: unknown): string[] {
  if (input === null || input === undefined) return []
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
  }
  if (Array.isArray(input)) {
    return input
      .filter((item): item is string => typeof item === 'string')
      .flatMap((item) => item.split(','))
      .map((token) => token.trim())
      .filter(Boolean)
  }
  return []
}

function sha256Digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

export function verifyBearerAuthHeader(
  authorizationHeader: string | string[] | undefined,
  expectedTokens: readonly string[],
): boolean {
  if (expectedTokens.length === 0) return false
  if (typeof authorizationHeader !== 'string') return false

  const trimmed = authorizationHeader.trim()
  const match = /^Bearer\s+(\S+)$/i.exec(trimmed)
  if (!match) return false

  const providedDigest = sha256Digest(match[1])
  let matched = 0
  for (const expectedToken of expectedTokens) {
    if (!expectedToken) continue
    const expectedDigest = sha256Digest(expectedToken)
    if (timingSafeEqual(providedDigest, expectedDigest)) {
      matched |= 1
    }
  }

  return matched === 1
}

export function extractHostname(hostHeaderOrValue: string): string | null {
  const trimmed = hostHeaderOrValue.trim()
  if (!trimmed || /[\s/\\@\r\n\0]/.test(trimmed)) return null

  if (trimmed.startsWith('[')) {
    const closingIndex = trimmed.indexOf(']')
    if (closingIndex <= 1) return null
    const rest = trimmed.slice(closingIndex + 1)
    if (rest && !/^:\d{1,5}$/.test(rest)) return null
    return trimmed.slice(1, closingIndex).toLowerCase()
  }

  const colonCount = (trimmed.match(/:/g) || []).length
  if (colonCount > 1) {
    // Unbracketed IPv6 literal (valid as configured server host, e.g. ::1)
    return trimmed.toLowerCase()
  }

  if (colonCount === 1) {
    const [hostname, port] = trimmed.split(':')
    if (!hostname || !/^\d{1,5}$/.test(port)) return null
    return hostname.toLowerCase()
  }

  return trimmed.toLowerCase()
}

export function isLoopbackHost(host: string): boolean {
  const hostname = extractHostname(host)
  if (!hostname) return false
  if (hostname === 'localhost' || hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') {
    return true
  }
  return /^127(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(hostname)
}

export function isAllowedHttpHostHeader(
  hostHeader: string | string[] | undefined,
  configuredServerHost: string,
): boolean {
  if (typeof hostHeader !== 'string') return false
  const requestHostname = extractHostname(hostHeader)
  if (!requestHostname) return false

  if (isLoopbackHost(configuredServerHost)) {
    return isLoopbackHost(requestHostname)
  }

  return true
}

export function hasOutboundApiCredentials(options: {
  apiKey?: string
  securityCredentials?: Record<string, string>
  customHeaders?: Record<string, string>
  specConfigs?: ReadonlyArray<{ customHeaders?: Record<string, string> }>
}): boolean {
  if (typeof options.apiKey === 'string' && options.apiKey.trim().length > 0) {
    return true
  }

  if (
    options.securityCredentials &&
    Object.values(options.securityCredentials).some(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )
  ) {
    return true
  }

  const headerSets: Array<Record<string, string> | undefined> = [
    options.customHeaders,
    ...(options.specConfigs?.map((spec) => spec.customHeaders) ?? []),
  ]

  for (const headers of headerSets) {
    if (!headers) continue
    for (const [name, value] of Object.entries(headers)) {
      if (
        SENSITIVE_OUTBOUND_HEADER_NAMES.has(name.trim().toLowerCase()) &&
        typeof value === 'string' &&
        value.trim().length > 0
      ) {
        return true
      }
    }
  }

  return false
}

export interface HttpSecurityPolicyInput {
  authTokens: readonly string[]
  allowUnauthenticatedHttp: boolean
  walletConfigured: boolean
  hasApiCredentials: boolean
  hasWriteTools: boolean
}

export function assertHttpTransportSecurityPolicy(input: HttpSecurityPolicyInput): void {
  if (input.authTokens.length > 0) {
    return
  }

  if (!input.allowUnauthenticatedHttp) {
    throw new Error(
      'Streamable HTTP transport requires authentication by default. Configure MCP_AUTH_TOKEN (or --authToken), or explicitly set MCP_ALLOW_UNAUTHENTICATED_HTTP=true ONLY for public read-only deployments.',
    )
  }

  if (input.walletConfigured || input.hasApiCredentials || input.hasWriteTools) {
    throw new Error(
      'Unauthenticated Streamable HTTP MCP is forbidden when a wallet, outbound API credentials, or write tools are enabled. Configure MCP_AUTH_TOKEN or run in credential-free read-only mode (MCP_READ_ONLY=true).',
    )
  }
}
