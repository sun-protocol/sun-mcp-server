import { execFileSync } from 'child_process'
import path from 'path'

describe('transitive router SDK dependencies', () => {
  it('preserves Solana JSON-RPC success and error handling with the overridden client', () => {
    // Use Node's real CommonJS/ESM loader; Jest 29 cannot load the SDK's ESM dependencies.
    const result = execFileSync(
      process.execPath,
      [
        '-e',
        `
      const assert = require('node:assert/strict');
      const { Connection } = require('@solana/web3.js');
      const { Token, CurrencyAmount } = require('@pancakeswap/swap-sdk-core');
      async function main() {
        let fail = false;
        const seen = new Set();
        const connection = new Connection('http://127.0.0.1:1', {
          fetch: async (_url, options) => {
            const request = JSON.parse(options.body);
            assert.equal(request.method, 'getVersion');
            assert.equal(request.jsonrpc, '2.0');
            assert.equal(typeof request.id, 'string');
            assert(!seen.has(request.id));
            seen.add(request.id);
            return new Response(JSON.stringify({
              jsonrpc: '2.0', id: request.id,
              ...(fail ? { error: { code: -32000, message: 'fixture failure' } }
                : { result: { 'solana-core': '1.99.0', 'feature-set': 123 } })
            }), { headers: { 'Content-Type': 'application/json' } });
          }
        });
        assert.deepEqual(await connection.getVersion(), { 'solana-core': '1.99.0', 'feature-set': 123 });
        fail = true;
        await assert.rejects(connection.getVersion(), /fixture failure/);
        const token = new Token(1, '0x0000000000000000000000000000000000000001', 6);
        assert.equal(CurrencyAmount.fromRawAmount(token, '123456789').toExact(), '123.456789');
        process.stdout.write('ok');
      }
      main().catch(error => { console.error(error); process.exitCode = 1; });
    `,
      ],
      { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 10000 },
    )
    expect(result).toBe('ok')
  })
})
