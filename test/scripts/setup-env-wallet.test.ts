import { PassThrough, Writable } from 'stream'
import fs from 'fs'
import os from 'os'
import path from 'path'

jest.mock('@scure/bip39', () => ({}))
jest.mock('@scure/bip39/wordlists/english.js', () => ({ wordlist: [] }))
jest.mock('@scure/bip32', () => ({ HDKey: {} }))
jest.mock('tronweb', () => ({ TronWeb: { address: { fromPrivateKey: jest.fn() } } }))

import { createPromptSession, readEnvFile, writeEnvFile } from '../../scripts/setup-env-wallet'

class FakeTtyInput extends PassThrough {
  isTTY = true
  isRaw = false

  setRawMode(mode: boolean): this {
    this.isRaw = mode
    return this
  }
}

class CaptureOutput extends Writable {
  isTTY = true
  columns = 80
  private readonly chunks: string[] = []

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString())
    callback()
  }

  text(): string {
    return this.chunks.join('')
  }
}

describe('wallet environment setup security', () => {
  it('does not echo secret input on a trusted TTY', async () => {
    const input = new FakeTtyInput()
    const output = new CaptureOutput()
    const session = createPromptSession(input, output)
    const secret = 'correct horse battery staple'

    const answerPromise = session.promptSecret('Mnemonic: ')
    input.write(`${secret}\n`)

    await expect(answerPromise).resolves.toBe(secret)
    expect(output.text()).toContain('Mnemonic: ')
    expect(output.text()).not.toContain(secret)
    session.close()
  })

  it('rejects secret input without a trusted TTY', async () => {
    const input = new PassThrough()
    const output = new CaptureOutput()
    output.isTTY = false
    const session = createPromptSession(input, output)

    await expect(session.promptSecret('Private key: ')).rejects.toThrow(
      'Secret input requires an interactive TTY',
    )
    session.close()
  })

  it('atomically creates and overwrites secret files with mode 0600', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sun-wallet-env-'))
    const envFile = path.join(directory, '.env')

    try {
      writeEnvFile({ AGENT_WALLET_PRIVATE_KEY: 'first-secret' }, envFile)
      expect(fs.statSync(envFile).mode & 0o777).toBe(0o600)

      fs.chmodSync(envFile, 0o644)
      writeEnvFile({ AGENT_WALLET_PRIVATE_KEY: 'second-secret' }, envFile)

      expect(fs.statSync(envFile).mode & 0o777).toBe(0o600)
      expect(fs.readFileSync(envFile, 'utf8')).toBe('AGENT_WALLET_PRIVATE_KEY=second-secret\n')
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it('repairs permissions before reading an existing secret file', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sun-wallet-env-'))
    const envFile = path.join(directory, '.env')

    try {
      fs.writeFileSync(envFile, 'TRON_GRID_API_KEY=test-secret\n', { mode: 0o644 })

      expect(readEnvFile(envFile)).toEqual({ TRON_GRID_API_KEY: 'test-secret' })
      expect(fs.statSync(envFile).mode & 0o777).toBe(0o600)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it('refuses to overwrite a symlinked secret file', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sun-wallet-env-'))
    const target = path.join(directory, 'target')
    const envFile = path.join(directory, '.env')

    try {
      fs.writeFileSync(target, 'unchanged')
      fs.symlinkSync(target, envFile)

      expect(() => writeEnvFile({ SECRET: 'replacement' }, envFile)).toThrow(
        'Refusing to use non-regular secret file',
      )
      expect(fs.readFileSync(target, 'utf8')).toBe('unchanged')
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
