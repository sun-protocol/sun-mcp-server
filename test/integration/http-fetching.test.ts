/**
 * HTTP fetching tests without opening local sockets.
 * We mock fetchFromUrl to keep tests deterministic in sandboxed CI.
 */

import { jest } from '@jest/globals'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { pathToFileURL } from 'url'

describe('HTTP Fetching Tests (SUN.IO)', () => {
  const specUrl = 'https://fixtures.local/sunio-open-api.json'
  const overlayUrl = 'https://fixtures.local/sunio-overlay.json'
  let specContent = ''
  let overlayContent = ''

  beforeAll(async () => {
    const specPath = path.resolve(process.cwd(), 'specs/sunio-open-api.json')
    const overlayPath = path.resolve(process.cwd(), 'specs/sunio-overlay.json')
    specContent = await fs.readFile(specPath, 'utf8')
    overlayContent = await fs.readFile(overlayPath, 'utf8')
  })

  beforeEach(() => {
    jest.resetModules()
  })

  it('fetches SUN.IO OpenAPI spec via HTTP URL', async () => {
    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [],
        mcpPort: 8080,
        targetApiBaseUrl: undefined,
        apiKey: undefined,
        securitySchemeName: undefined,
        securityCredentials: {},
        customHeaders: {},
        disableXMcp: false,
        filter: {
          whitelist: null,
          blacklist: [],
        },
      },
    }))

    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrlWithMetadata: jest.fn(async (url: string) => {
        if (url === specUrl) return { content: specContent, finalUrl: url }
        throw new Error(`Unexpected URL: ${url}`)
      }),
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')
    const openApiSpec = await getProcessedOpenApi()

    expect(openApiSpec.openapi).toBe('3.0.1')
    expect(openApiSpec.info.title).toBe('SUN.IO API v2')
    expect(openApiSpec.paths['/apiv2/price']).toBeDefined()
  })

  it('fetches SUN.IO overlay via HTTP URL', async () => {
    const localSpecPath = path.resolve(process.cwd(), 'specs/sunio-open-api.json')

    jest.doMock('../../src/config', () => ({
      config: {
        specPath: localSpecPath,
        overlayPaths: [overlayUrl],
        mcpPort: 8080,
        targetApiBaseUrl: undefined,
        apiKey: undefined,
        securitySchemeName: undefined,
        securityCredentials: {},
        customHeaders: {},
        disableXMcp: false,
        filter: {
          whitelist: null,
          blacklist: [],
        },
      },
    }))

    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrl: jest.fn(async (url: string) => {
        if (url === overlayUrl) return overlayContent
        throw new Error(`Unexpected URL: ${url}`)
      }),
      fetchFromUrlWithMetadata: jest.fn(),
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')
    const openApiSpec = await getProcessedOpenApi()

    expect(openApiSpec.info.description).toContain('MCP-oriented descriptions')
    expect(openApiSpec.paths['/apiv2/pools'].get.summary).toBe('Get SUNSWAP pools with filters')
    expect(openApiSpec.paths['/apiv2/price'].get.summary).toBe('Get SUNSWAP token prices')
  })

  it('fetches both spec and overlay via HTTP URLs', async () => {
    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [overlayUrl],
        mcpPort: 8080,
        targetApiBaseUrl: undefined,
        apiKey: undefined,
        securitySchemeName: undefined,
        securityCredentials: {},
        customHeaders: {},
        disableXMcp: false,
        filter: {
          whitelist: null,
          blacklist: [],
        },
      },
    }))

    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrl: jest.fn(async (url: string) => {
        if (url === overlayUrl) return overlayContent
        throw new Error(`Unexpected URL: ${url}`)
      }),
      fetchFromUrlWithMetadata: jest.fn(async (url: string) => {
        if (url === specUrl) return { content: specContent, finalUrl: url }
        throw new Error(`Unexpected URL: ${url}`)
      }),
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')
    const openApiSpec = await getProcessedOpenApi()

    expect(openApiSpec.openapi).toBe('3.0.1')
    expect(openApiSpec.paths['/apiv2/price']).toBeDefined()
    expect(openApiSpec.paths['/apiv2/pools'].get.summary).toBe('Get SUNSWAP pools with filters')
  })

  it('rejects external file references in a remote OpenAPI spec', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sun-mcp-openapi-ref-'))
    const externalSchemaPath = path.join(tempDirectory, 'external-schema.json')

    try {
      await fs.writeFile(
        externalSchemaPath,
        JSON.stringify({ type: 'object', properties: { secret: { type: 'string' } } }),
        'utf8',
      )

      const remoteSpec = JSON.stringify({
        openapi: '3.0.1',
        info: { title: 'Remote fixture', version: '1.0.0' },
        servers: [{ url: 'https://api.example.test' }],
        paths: {
          '/fixture': {
            get: {
              operationId: 'getFixture',
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: { $ref: pathToFileURL(externalSchemaPath).href },
                    },
                  },
                },
              },
            },
          },
        },
      })

      jest.doMock('../../src/config', () => ({
        config: {
          specPath: specUrl,
          overlayPaths: [],
          targetApiBaseUrl: undefined,
          customHeaders: {},
          disableXMcp: false,
          filter: { whitelist: null, blacklist: [] },
        },
      }))
      jest.doMock('../../src/utils/httpClient', () => ({
        isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
        fetchFromUrlWithMetadata: jest.fn(async (url: string) => ({
          content: remoteSpec,
          finalUrl: url,
        })),
      }))

      const { getProcessedOpenApi } = require('../../src/openapiProcessor')
      await expect(getProcessedOpenApi()).rejects.toThrow()
    } finally {
      await fs.rm(tempDirectory, { recursive: true, force: true })
    }
  })

  it('dereferences internal references in a remote OpenAPI spec', async () => {
    const remoteSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Remote fixture', version: '1.0.0' },
      servers: [{ url: 'https://api.example.test' }],
      paths: {
        '/fixture': {
          get: {
            operationId: 'getFixture',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Fixture' } },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Fixture: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    })

    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [],
        targetApiBaseUrl: undefined,
        customHeaders: {},
        disableXMcp: false,
        filter: { whitelist: null, blacklist: [] },
      },
    }))
    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrlWithMetadata: jest.fn(async (url: string) => ({
        content: remoteSpec,
        finalUrl: url,
      })),
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')
    const openApiSpec = await getProcessedOpenApi()
    const schema =
      openApiSpec.paths['/fixture'].get.responses['200'].content['application/json'].schema

    expect(schema).toEqual({ type: 'object', properties: { id: { type: 'string' } } })
  })

  it('dereferences relative HTTP references through the guarded fetch client', async () => {
    const externalSchemaUrl = 'https://fixtures.local/schemas/fixture.json'
    const remoteSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Remote fixture', version: '1.0.0' },
      servers: [{ url: 'https://api.example.test' }],
      paths: {
        '/fixture': {
          get: {
            operationId: 'getFixture',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: './schemas/fixture.json' } },
                },
              },
            },
          },
        },
      },
    })
    const fetchFromUrlWithMetadata = jest.fn(async (url: string) => {
      if (url === specUrl) return { content: remoteSpec, finalUrl: url }
      if (url === externalSchemaUrl) {
        return {
          content: JSON.stringify({ type: 'object', properties: { id: { type: 'string' } } }),
          finalUrl: url,
        }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [],
        targetApiBaseUrl: undefined,
        customHeaders: {},
        disableXMcp: false,
        filter: { whitelist: null, blacklist: [] },
      },
    }))
    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrlWithMetadata,
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')
    const openApiSpec = await getProcessedOpenApi()
    const schema =
      openApiSpec.paths['/fixture'].get.responses['200'].content['application/json'].schema

    expect(schema).toEqual({ type: 'object', properties: { id: { type: 'string' } } })
    expect(fetchFromUrlWithMetadata).toHaveBeenCalledWith(externalSchemaUrl)
  })

  it('uses the final root URL as the base for relative references after a redirect', async () => {
    const redirectedRootUrl = 'https://cdn.fixtures.local/v1/openapi.json'
    const redirectedSchemaUrl = 'https://cdn.fixtures.local/v1/schema.json'
    const remoteSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Redirected fixture', version: '1.0.0' },
      servers: [{ url: 'https://api.example.test' }],
      paths: {
        '/fixture': {
          get: {
            operationId: 'getFixture',
            responses: {
              '200': {
                description: 'ok',
                content: { 'application/json': { schema: { $ref: './schema.json' } } },
              },
            },
          },
        },
      },
    })
    const fetchFromUrlWithMetadata = jest.fn(async (url: string) => {
      if (url === specUrl) return { content: remoteSpec, finalUrl: redirectedRootUrl }
      if (url === redirectedSchemaUrl) {
        return { content: JSON.stringify({ type: 'string' }), finalUrl: url }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [],
        targetApiBaseUrl: undefined,
        customHeaders: {},
        disableXMcp: false,
        filter: { whitelist: null, blacklist: [] },
      },
    }))
    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrlWithMetadata,
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')
    const openApiSpec = await getProcessedOpenApi()

    expect(
      openApiSpec.paths['/fixture'].get.responses['200'].content['application/json'].schema,
    ).toEqual({ type: 'string' })
    expect(fetchFromUrlWithMetadata).toHaveBeenCalledWith(redirectedSchemaUrl)
  })

  it('parses redirected YAML roots with query parameters from the final URL pathname', async () => {
    const redirectedRootUrl = 'https://cdn.fixtures.local/openapi.yaml?token=test'
    const yamlSpec = [
      'openapi: 3.0.1',
      'info:',
      '  title: Redirected YAML fixture',
      '  version: 1.0.0',
      'servers:',
      '  - url: https://api.example.test',
      'paths:',
      '  /fixture:',
      '    get:',
      '      operationId: getFixture',
      '      responses:',
      "        '200':",
      '          description: ok',
    ].join('\n')

    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [],
        targetApiBaseUrl: undefined,
        customHeaders: {},
        disableXMcp: false,
        filter: { whitelist: null, blacklist: [] },
      },
    }))
    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrlWithMetadata: jest.fn(async () => ({
        content: yamlSpec,
        finalUrl: redirectedRootUrl,
      })),
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')
    const openApiSpec = await getProcessedOpenApi()

    expect(openApiSpec.info.title).toBe('Redirected YAML fixture')
  })

  it('rejects redirects for nested remote references', async () => {
    const requestedSchemaUrl = 'https://fixtures.local/schema.json'
    const redirectedSchemaUrl = 'https://cdn.fixtures.local/schema.json'
    const remoteSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Remote fixture', version: '1.0.0' },
      paths: {
        '/fixture': {
          get: {
            operationId: 'getFixture',
            responses: {
              '200': {
                description: 'ok',
                content: { 'application/json': { schema: { $ref: './schema.json' } } },
              },
            },
          },
        },
      },
    })
    const fetchFromUrlWithMetadata = jest.fn(async (url: string) => {
      if (url === specUrl) return { content: remoteSpec, finalUrl: url }
      if (url === requestedSchemaUrl) {
        return { content: JSON.stringify({ type: 'string' }), finalUrl: redirectedSchemaUrl }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [],
        targetApiBaseUrl: undefined,
        customHeaders: {},
        disableXMcp: false,
        filter: { whitelist: null, blacklist: [] },
      },
    }))
    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrlWithMetadata,
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')

    await expect(getProcessedOpenApi()).rejects.toThrow('Error reading file')
  })

  it('rejects a file reference returned by a nested remote reference', async () => {
    const externalSchemaUrl = 'https://fixtures.local/schemas/fixture.json'
    const remoteSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Remote fixture', version: '1.0.0' },
      paths: {
        '/fixture': {
          get: {
            operationId: 'getFixture',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: './schemas/fixture.json' } },
                },
              },
            },
          },
        },
      },
    })
    const fetchFromUrlWithMetadata = jest.fn(async (url: string) => {
      if (url === specUrl) return { content: remoteSpec, finalUrl: url }
      if (url === externalSchemaUrl) {
        return { content: JSON.stringify({ $ref: 'file:///etc/hosts' }), finalUrl: url }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    jest.doMock('../../src/config', () => ({
      config: {
        specPath: specUrl,
        overlayPaths: [],
        targetApiBaseUrl: undefined,
        customHeaders: {},
        disableXMcp: false,
        filter: { whitelist: null, blacklist: [] },
      },
    }))
    jest.doMock('../../src/utils/httpClient', () => ({
      isHttpUrl: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      fetchFromUrlWithMetadata,
    }))

    const { getProcessedOpenApi } = require('../../src/openapiProcessor')

    await expect(getProcessedOpenApi()).rejects.toThrow()
    expect(fetchFromUrlWithMetadata).toHaveBeenCalledWith(externalSchemaUrl)
  })

  it('keeps relative file references available for a local OpenAPI spec', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sun-mcp-local-openapi-ref-'))
    const rootSpecPath = path.join(tempDirectory, 'openapi.json')
    const externalSchemaPath = path.join(tempDirectory, 'fixture-schema.json')

    try {
      await fs.writeFile(
        externalSchemaPath,
        JSON.stringify({ type: 'object', properties: { id: { type: 'string' } } }),
        'utf8',
      )
      await fs.writeFile(
        rootSpecPath,
        JSON.stringify({
          openapi: '3.0.1',
          info: { title: 'Local fixture', version: '1.0.0' },
          servers: [{ url: 'https://api.example.test' }],
          paths: {
            '/fixture': {
              get: {
                operationId: 'getFixture',
                responses: {
                  '200': {
                    description: 'ok',
                    content: {
                      'application/json': { schema: { $ref: './fixture-schema.json' } },
                    },
                  },
                },
              },
            },
          },
        }),
        'utf8',
      )

      jest.doMock('../../src/config', () => ({
        config: {
          specPath: rootSpecPath,
          overlayPaths: [],
          targetApiBaseUrl: undefined,
          customHeaders: {},
          disableXMcp: false,
          filter: { whitelist: null, blacklist: [] },
        },
      }))

      const { getProcessedOpenApi } = require('../../src/openapiProcessor')
      const openApiSpec = await getProcessedOpenApi()
      const schema =
        openApiSpec.paths['/fixture'].get.responses['200'].content['application/json'].schema

      expect(schema).toEqual({ type: 'object', properties: { id: { type: 'string' } } })
    } finally {
      await fs.rm(tempDirectory, { recursive: true, force: true })
    }
  })

  it('does not allow a local OpenAPI spec to cross into remote references', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sun-mcp-local-remote-ref-'))
    const rootSpecPath = path.join(tempDirectory, 'openapi.json')

    try {
      await fs.writeFile(
        rootSpecPath,
        JSON.stringify({
          openapi: '3.0.1',
          info: { title: 'Local fixture', version: '1.0.0' },
          paths: {
            '/fixture': {
              get: {
                operationId: 'getFixture',
                responses: {
                  '200': {
                    description: 'ok',
                    content: {
                      'application/json': {
                        schema: { $ref: 'https://93.184.216.34/schema.json' },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        'utf8',
      )
      jest.doMock('../../src/config', () => ({
        config: {
          specPath: rootSpecPath,
          overlayPaths: [],
          targetApiBaseUrl: undefined,
          customHeaders: {},
          disableXMcp: false,
          filter: { whitelist: null, blacklist: [] },
        },
      }))

      const { getProcessedOpenApi } = require('../../src/openapiProcessor')

      await expect(getProcessedOpenApi()).rejects.toThrow('Unable to resolve $ref pointer')
    } finally {
      await fs.rm(tempDirectory, { recursive: true, force: true })
    }
  })
})
