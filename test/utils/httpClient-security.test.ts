import { jest } from '@jest/globals'

interface MockResponse {
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly headers: { get(name: string): string | null }
  readonly body: { destroy(): void }
  text(): Promise<string>
}

function response(status: number, body: string, location?: string): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 302 ? 'Found' : 'OK',
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'location' && location !== undefined ? location : null,
    },
    body: { destroy: jest.fn() },
    text: async () => body,
  }
}

describe('remote fetch SSRF controls', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ALLOW_PRIVATE_URLS
    jest.restoreAllMocks()
    jest.resetModules()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('revalidates a redirect target before following it', async () => {
    const fetchMock = jest.fn(async (_url: string, options?: { redirect?: string }) => {
      if (options?.redirect === 'manual') {
        return response(302, '', 'http://127.0.0.1/internal')
      }
      // Simulate node-fetch's default redirect following: the private response is hidden from callers.
      return response(200, 'private response')
    })
    jest.doMock('node-fetch', () => ({ __esModule: true, default: fetchMock }))

    const { fetchFromUrl } = require('../../src/utils/httpClient')

    await expect(fetchFromUrl('https://93.184.216.34/spec.json')).rejects.toThrow(
      'Remote fetch failed',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns the final public URL after an allowed redirect', async () => {
    const redirectedUrl = 'https://93.184.216.35/v1/openapi.json'
    const fetchMock = jest.fn(async (url: string) =>
      url === redirectedUrl
        ? response(200, '{"openapi":"3.0.1"}')
        : response(302, '', redirectedUrl),
    )
    jest.doMock('node-fetch', () => ({ __esModule: true, default: fetchMock }))

    const { fetchFromUrlWithMetadata } = require('../../src/utils/httpClient')

    await expect(fetchFromUrlWithMetadata('https://93.184.216.34/spec.json')).resolves.toEqual({
      content: '{"openapi":"3.0.1"}',
      finalUrl: redirectedUrl,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects a public hostname when DNS resolves it to a private address', async () => {
    const fetchMock = jest.fn(async () => response(200, 'private response'))
    const lookupMock = jest.fn(
      (
        _hostname: string,
        _options: unknown,
        callback: (error: null, addresses: Array<{ address: string; family: number }>) => void,
      ) => callback(null, [{ address: '127.0.0.1', family: 4 }]),
    )

    jest.doMock('node-fetch', () => ({ __esModule: true, default: fetchMock }))
    const dns = require('node:dns')
    jest.spyOn(dns, 'lookup').mockImplementation(lookupMock as any)

    const { fetchFromUrl } = require('../../src/utils/httpClient')

    await expect(fetchFromUrl('https://public.example/spec.json')).rejects.toThrow(
      'Remote fetch failed',
    )
    expect(lookupMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    'http://127.0.0.1/spec.json',
    'http://[::1]/spec.json',
    'http://[::ffff:127.0.0.1]/spec.json',
    'http://[::127.0.0.1]/spec.json',
    'http://[::ffff:0:127.0.0.1]/spec.json',
    'http://[64:ff9b:1::7f00:1]/spec.json',
    'http://[fec0::1]/spec.json',
    'http://localhost./spec.json',
  ])('rejects non-public literal or local URL %s before fetching', async (url) => {
    const fetchMock = jest.fn(async () => response(200, 'private response'))
    jest.doMock('node-fetch', () => ({ __esModule: true, default: fetchMock }))

    const { fetchFromUrl } = require('../../src/utils/httpClient')

    await expect(fetchFromUrl(url)).rejects.toThrow('Remote fetch failed')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves the explicit ALLOW_PRIVATE_URLS opt-in', async () => {
    process.env.ALLOW_PRIVATE_URLS = 'true'
    const fetchMock = jest.fn(async () => response(200, 'private response'))
    jest.doMock('node-fetch', () => ({ __esModule: true, default: fetchMock }))

    const { fetchFromUrl } = require('../../src/utils/httpClient')

    await expect(fetchFromUrl('http://127.0.0.1/spec.json')).resolves.toBe('private response')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1/spec.json',
      expect.objectContaining({ agent: undefined, redirect: 'manual' }),
    )
  })
})
