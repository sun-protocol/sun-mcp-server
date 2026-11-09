import { SunAPI, SunKit } from '@sun-protocol/sun-kit'
import { providers } from 'tronweb'
import { z } from 'zod'
import { registerSunswapTools } from '../../src/tools/sunswap'
import type { RegisterToolFn } from '../../src/types'

jest.mock('../../src/wallet', () => ({ getWalletAddress: jest.fn() }))

const contractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const uint256Max = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

describe('MCP contract results with real TronWeb', () => {
  const handlers = new Map<string, Parameters<RegisterToolFn>[2]>()

  beforeEach(() => {
    handlers.clear()
    const registerTool: RegisterToolFn = (name, definition, handler) => {
      if (!definition.inputSchema) throw new Error(`Missing input schema for ${name}`)
      const schema = z.object(definition.inputSchema)
      handlers.set(name, (args) => handler(schema.parse(args)))
    }
    registerSunswapTools(registerTool, { api: new SunAPI(), kit: new SunKit() })
  })

  afterEach(() => jest.restoreAllMocks())

  function stubConstantCall(functionSelector: string, encodedResult: string) {
    jest
      .spyOn(providers.HttpProvider.prototype, 'request')
      .mockImplementation(async (url, args) => {
        expect(url).toBe('wallet/triggerconstantcontract')
        expect(args).toMatchObject({ function_selector: functionSelector })
        return { result: { result: true }, constant_result: [encodedResult] }
      })
  }

  it.each([
    { type: 'uint8', encoded: '0'.repeat(63) + '6', expected: '6' },
    { type: 'uint256', encoded: '0'.repeat(64), expected: '0' },
    { type: 'uint256', encoded: 'f'.repeat(64), expected: uint256Max },
    { type: 'int256', encoded: 'f'.repeat(64), expected: '-1' },
  ])(
    'serializes $type result $expected without precision loss',
    async ({ type, encoded, expected }) => {
      stubConstantCall('value()', encoded)

      const handler = handlers.get('sunswap_read_contract')
      if (!handler) throw new Error('Contract read tool was not registered')
      const response = await handler({
        address: contractAddress,
        functionName: 'value',
        abi: [
          {
            type: 'function',
            name: 'value',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type }],
          },
        ],
      })

      expect(response.isError).not.toBe(true)
      expect(JSON.parse(response.content[0].text)).toEqual({ result: expected })
    },
  )

  it('serializes a quote array containing uint256 values without precision loss', async () => {
    // ABI words: array offset (32 bytes), length (2), uint256 max, zero.
    stubConstantCall(
      'quoteExactInput()',
      '20'.padStart(64, '0') + '2'.padStart(64, '0') + 'f'.repeat(64) + '0'.repeat(64),
    )

    const handler = handlers.get('sunswap_quote_exact_input')
    if (!handler) throw new Error('Quote tool was not registered')
    const response = await handler({
      routerAddress: contractAddress,
      args: [],
      abi: [
        {
          type: 'function',
          name: 'quoteExactInput',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint256[]' }],
        },
      ],
    })

    expect(response.isError).not.toBe(true)
    expect(JSON.parse(response.content[0].text)).toEqual({ result: [uint256Max, '0'] })
  })
})
