import {
  assertHttpTransportSecurityPolicy,
  hasOutboundApiCredentials,
  isAllowedHttpHostHeader,
  isLoopbackHost,
  parseAuthTokens,
  verifyBearerAuthHeader,
} from '../../src/utils/httpAuth'

describe('HTTP authentication and security policy utilities', () => {
  describe('parseAuthTokens', () => {
    it('parses single, comma-separated, and array token inputs while trimming whitespace', () => {
      expect(parseAuthTokens(undefined)).toEqual([])
      expect(parseAuthTokens('')).toEqual([])
      expect(parseAuthTokens('  secret-1  ')).toEqual(['secret-1'])
      expect(parseAuthTokens('token-a, token-b ,, token-c ')).toEqual([
        'token-a',
        'token-b',
        'token-c',
      ])
      expect(parseAuthTokens(['alpha, beta', ' gamma '])).toEqual(['alpha', 'beta', 'gamma'])
    })
  })

  describe('verifyBearerAuthHeader', () => {
    it('accepts valid Bearer tokens case-insensitively on scheme and supports rotation lists', () => {
      expect(verifyBearerAuthHeader('Bearer primary-secret', ['primary-secret'])).toBe(true)
      expect(
        verifyBearerAuthHeader('bearer rotated-secret', ['old-secret', 'rotated-secret']),
      ).toBe(true)
    })

    it('rejects missing, malformed, non-Bearer, or mismatched headers', () => {
      expect(verifyBearerAuthHeader(undefined, ['secret'])).toBe(false)
      expect(verifyBearerAuthHeader('', ['secret'])).toBe(false)
      expect(verifyBearerAuthHeader(['Bearer secret'], ['secret'])).toBe(false)
      expect(verifyBearerAuthHeader('Basic c2VjcmV0', ['secret'])).toBe(false)
      expect(verifyBearerAuthHeader('Bearer ', ['secret'])).toBe(false)
      expect(verifyBearerAuthHeader('Bearer secret extra', ['secret'])).toBe(false)
      expect(verifyBearerAuthHeader('Bearer wrong-secret', ['secret'])).toBe(false)
      expect(verifyBearerAuthHeader('Bearer secret', [])).toBe(false)
    })
  })

  describe('isLoopbackHost and isAllowedHttpHostHeader', () => {
    it('identifies IPv4, IPv6, and localhost loopback addresses', () => {
      expect(isLoopbackHost('127.0.0.1')).toBe(true)
      expect(isLoopbackHost('127.0.1.1:8080')).toBe(true)
      expect(isLoopbackHost('localhost:8080')).toBe(true)
      expect(isLoopbackHost('::1')).toBe(true)
      expect(isLoopbackHost('[::1]:8080')).toBe(true)
      expect(isLoopbackHost('0.0.0.0')).toBe(false)
      expect(isLoopbackHost('mcp.sun.io')).toBe(false)
    })

    it('blocks DNS rebinding Host headers when server is bound to loopback', () => {
      expect(isAllowedHttpHostHeader('127.0.0.1:8080', '127.0.0.1')).toBe(true)
      expect(isAllowedHttpHostHeader('localhost:8080', '127.0.0.1')).toBe(true)
      expect(isAllowedHttpHostHeader('[::1]:8080', '::1')).toBe(true)
      expect(isAllowedHttpHostHeader('rebind.attacker.example:8080', '127.0.0.1')).toBe(false)
      expect(isAllowedHttpHostHeader(undefined, '127.0.0.1')).toBe(false)
    })

    it('accepts valid external Host headers when bound to 0.0.0.0 while rejecting malformed ones', () => {
      expect(isAllowedHttpHostHeader('mcp.sun.io', '0.0.0.0')).toBe(true)
      expect(isAllowedHttpHostHeader('mcp.sun.io:8080', '0.0.0.0')).toBe(true)
      expect(isAllowedHttpHostHeader('evil.com/path', '0.0.0.0')).toBe(false)
      expect(isAllowedHttpHostHeader(undefined, '0.0.0.0')).toBe(false)
    })
  })

  describe('hasOutboundApiCredentials', () => {
    it('detects apiKey, securityCredentials, and sensitive custom headers', () => {
      expect(hasOutboundApiCredentials({})).toBe(false)
      expect(
        hasOutboundApiCredentials({
          customHeaders: { 'User-Agent': 'OpenAPI-MCP-Client/1.0' },
        }),
      ).toBe(false)
      expect(hasOutboundApiCredentials({ apiKey: 'k1' })).toBe(true)
      expect(hasOutboundApiCredentials({ securityCredentials: { ApiKeyAuth: 'secret' } })).toBe(
        true,
      )
      expect(
        hasOutboundApiCredentials({
          specConfigs: [{ customHeaders: { Authorization: 'Bearer downstream' } }],
        }),
      ).toBe(true)
    })
  })

  describe('assertHttpTransportSecurityPolicy', () => {
    it('allows startup whenever at least one auth token is configured', () => {
      expect(() =>
        assertHttpTransportSecurityPolicy({
          authTokens: ['strong-token'],
          allowUnauthenticatedHttp: false,
          walletConfigured: true,
          hasApiCredentials: true,
          hasWriteTools: true,
        }),
      ).not.toThrow()
    })

    it('rejects unauthenticated HTTP startup by default', () => {
      expect(() =>
        assertHttpTransportSecurityPolicy({
          authTokens: [],
          allowUnauthenticatedHttp: false,
          walletConfigured: false,
          hasApiCredentials: false,
          hasWriteTools: false,
        }),
      ).toThrow(/requires authentication by default/i)
    })

    it('allows unauthenticated HTTP only in credential-free read-only mode', () => {
      expect(() =>
        assertHttpTransportSecurityPolicy({
          authTokens: [],
          allowUnauthenticatedHttp: true,
          walletConfigured: false,
          hasApiCredentials: false,
          hasWriteTools: false,
        }),
      ).not.toThrow()
    })

    it.each([
      [
        'walletConfigured',
        { walletConfigured: true, hasApiCredentials: false, hasWriteTools: false },
      ],
      [
        'hasApiCredentials',
        { walletConfigured: false, hasApiCredentials: true, hasWriteTools: false },
      ],
      ['hasWriteTools', { walletConfigured: false, hasApiCredentials: false, hasWriteTools: true }],
    ])(
      'rejects unauthenticated HTTP even with allowUnauthenticatedHttp=true when %s is active',
      (_reason, flags) => {
        expect(() =>
          assertHttpTransportSecurityPolicy({
            authTokens: [],
            allowUnauthenticatedHttp: true,
            ...flags,
          }),
        ).toThrow(/forbidden when a wallet, outbound API credentials, or write tools are enabled/i)
      },
    )
  })
})
