import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { executeApiCall } from '../../src/apiClient'
import { testConfig } from '../fixtures/test-config'
import { createTestApiCallDetails } from '../utils/testTypes'
import { config } from '../../src/config'

jest.mock('axios')
jest.mock('../../src/config', () => ({
  config: {
    apiKey: 'test-api-key',
    securitySchemeName: 'test-scheme',
    securityCredentials: {},
    customHeaders: { 'X-Test-Header': 'test-value' },
    disableXMcp: false,
    requestTimeoutMs: 30000,
  },
}))

describe('API Client Integration Tests (SUN.IO)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles successful GET price requests', async () => {
    const mockResponse: Partial<AxiosResponse> = {
      status: 200,
      data: testConfig.mockResponses.getPrice,
      headers: { 'content-type': 'application/json' },
    }
    ;(axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(
      mockResponse as AxiosResponse,
    )

    const apiCallDetails = createTestApiCallDetails({
      method: 'GET',
      pathTemplate: '/apiv2/price',
      serverUrl: testConfig.baseUrl,
      operationId: 'getPrice',
      parameters: [{ name: 'symbol', in: 'query', required: false } as any],
    })

    const result = await executeApiCall(apiCallDetails, { symbol: 'SUN,TRX' })

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
    expect(result.data).toEqual(testConfig.mockResponses.getPrice)
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining(`${testConfig.baseUrl}/apiv2/price`),
        headers: expect.any(Object),
      }),
    )
  })

  it('handles successful GET pools requests', async () => {
    const mockResponse: Partial<AxiosResponse> = {
      status: 200,
      data: testConfig.mockResponses.getPools,
      headers: { 'content-type': 'application/json' },
    }
    ;(axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(
      mockResponse as AxiosResponse,
    )

    const apiCallDetails = createTestApiCallDetails({
      method: 'GET',
      pathTemplate: '/apiv2/pools',
      serverUrl: testConfig.baseUrl,
      operationId: 'getPools',
      parameters: [{ name: 'protocol', in: 'query', required: false } as any],
    })

    const result = await executeApiCall(apiCallDetails, { protocol: 'V3', pageSize: 10 })

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
    expect(result.data).toEqual(testConfig.mockResponses.getPools)
    expect(axios).toHaveBeenCalled()
  })

  it('handles API error responses', async () => {
    const mockResponse: Partial<AxiosResponse> = {
      status: 404,
      data: { error: 'Pool not found' },
      headers: { 'content-type': 'application/json' },
    }
    ;(axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(
      mockResponse as AxiosResponse,
    )

    const apiCallDetails = createTestApiCallDetails({
      method: 'GET',
      pathTemplate: '/apiv2/pools',
      serverUrl: testConfig.baseUrl,
      operationId: 'getPools',
    })

    const result = await executeApiCall(apiCallDetails, { poolAddress: 'TNOTFOUND' })

    expect(result.success).toBe(false)
    expect(result.statusCode).toBe(404)
    expect(result.data).toEqual({ error: 'Pool not found' })
  })

  it('rejects non-object parameters', async () => {
    const apiCallDetails = createTestApiCallDetails({
      method: 'GET',
      pathTemplate: '/apiv2/price',
      serverUrl: testConfig.baseUrl,
      operationId: 'getPrice',
    })

    const resultNull = await executeApiCall(apiCallDetails, null as any)
    expect(resultNull.success).toBe(false)
    expect(resultNull.error).toContain('Invalid input: expected an object')

    const resultArray = await executeApiCall(apiCallDetails, [] as any)
    expect(resultArray.success).toBe(false)
    expect(resultArray.error).toContain('Invalid input: expected an object')

    const resultString = await executeApiCall(apiCallDetails, 'string' as any)
    expect(resultString.success).toBe(false)
    expect(resultString.error).toContain('Invalid input: expected an object')
  })

  it('does not expose query, URL, header, or exception credentials in logs', async () => {
    const secrets = {
      query: 'query-token-fixture',
      signedUrl: 'signed-url-fixture',
      urlPassword: 'url-password-fixture',
      xKey: 'x-key-fixture',
      xSecret: 'x-secret-fixture',
      privateKey: 'private-key-fixture',
      security: 'security-query-fixture',
    }
    ;(config.securityCredentials as Record<string, string>).QueryCredential = secrets.security
    ;(axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce(
      Object.assign(new Error(`request failed: ${Object.values(secrets).join(' ')}`), {
        code: 'ERR_NETWORK',
      }),
    )

    const apiCallDetails = createTestApiCallDetails({
      method: 'GET',
      pathTemplate: '/v1/resource/{resourceId}',
      serverUrl: `https://user:${secrets.urlPassword}@api.example.test/base?signature=${secrets.signedUrl}`,
      customHeaders: {
        'X-Secret': secrets.xSecret,
        'Private-Key': secrets.privateKey,
      },
      parameters: [
        { name: 'resourceId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'access_token', in: 'query', schema: { type: 'string' } },
        { name: 'X-Key', in: 'header', schema: { type: 'string' } },
      ] as any,
      securityRequirements: [{ QueryCredential: [] }],
      securitySchemes: {
        QueryCredential: { type: 'apiKey', in: 'query', name: 'credential' },
      },
    })

    const result = await executeApiCall(apiCallDetails, {
      resourceId: 'public-resource-id',
      access_token: secrets.query,
      'X-Key': secrets.xKey,
    })
    const requestConfig = (axios as jest.MockedFunction<typeof axios>).mock.calls[0][0] as
      | AxiosRequestConfig
      | undefined
    const capturedLogs = JSON.stringify((console.error as jest.Mock).mock.calls)

    expect(requestConfig?.params).toMatchObject({
      access_token: secrets.query,
      credential: secrets.security,
    })
    expect(requestConfig?.headers).toMatchObject({
      'X-Key': secrets.xKey,
      'X-Secret': secrets.xSecret,
      'Private-Key': secrets.privateKey,
    })
    expect(result.error).toBe('Network or request setup error')
    for (const secret of Object.values(secrets)) {
      expect(capturedLogs).not.toContain(secret)
      expect(result.error).not.toContain(secret)
    }

    delete (config.securityCredentials as Record<string, string>).QueryCredential
  })
})
