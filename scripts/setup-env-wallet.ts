#!/usr/bin/env ts-node
/**
 * Script to configure an env-based wallet for sun-mcp-server.
 *
 * Usage:
 *   npx ts-node scripts/setup-env-wallet.ts [command]
 *
 * Commands:
 *   generate       Generate a new mnemonic and derive address
 *   from-mnemonic  Derive address from existing mnemonic (interactive)
 *   from-key       Validate and show address from private key (interactive)
 *   show           Show current wallet configuration
 *   save           Save configuration to .env file (interactive)
 */

import 'dotenv/config'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { HDKey } from '@scure/bip32'
import { TronWeb } from 'tronweb'
import { randomBytes } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { Writable } from 'stream'

const ENV_FILE = path.join(__dirname, '..', '.env')

type TtyReadable = NodeJS.ReadableStream & { isTTY?: boolean }
type TtyWritable = NodeJS.WritableStream & { isTTY?: boolean }

class MaskingOutput extends Writable {
  muted = false

  constructor(private readonly target: NodeJS.WritableStream) {
    super()
  }

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.muted) {
      if (typeof chunk === 'string') {
        this.target.write(chunk, encoding)
      } else {
        this.target.write(chunk)
      }
    }
    callback()
  }
}

export interface PromptSession {
  prompt(question: string): Promise<string>
  promptSecret(question: string): Promise<string>
  close(): void
}

export function createPromptSession(
  input: TtyReadable = process.stdin,
  output: TtyWritable = process.stdout,
): PromptSession {
  const trustedTty = input.isTTY === true && output.isTTY === true
  const maskingOutput = new MaskingOutput(output)
  const rl = readline.createInterface({ input, output: maskingOutput, terminal: trustedTty })

  return {
    prompt(question: string): Promise<string> {
      return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()))
      })
    },
    promptSecret(question: string): Promise<string> {
      if (!trustedTty) {
        return Promise.reject(
          new Error('Secret input requires an interactive TTY; use a dedicated secret provider'),
        )
      }

      output.write(question)
      maskingOutput.muted = true
      return new Promise((resolve) => {
        rl.question('', (answer) => {
          maskingOutput.muted = false
          output.write('\n')
          resolve(answer.trim())
        })
      })
    },
    close(): void {
      maskingOutput.muted = false
      rl.close()
    },
  }
}

function generateMnemonic(): string {
  return bip39.generateMnemonic(wordlist, 128)
}

function deriveFromMnemonic(
  mnemonic: string,
  accountIndex = 0,
): { privateKey: string; address: string } {
  if (!bip39.validateMnemonic(mnemonic, wordlist)) {
    throw new Error('Invalid mnemonic')
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const hdKey = HDKey.fromMasterSeed(seed)
  const child = hdKey.derive(`m/44'/195'/0'/0/${accountIndex}`)

  if (!child.privateKey) {
    throw new Error('Failed to derive private key')
  }

  const privateKey = Buffer.from(child.privateKey).toString('hex')
  const address = TronWeb.address.fromPrivateKey(privateKey)

  return { privateKey, address: address as string }
}

function addressFromPrivateKey(privateKey: string): string {
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
  const address = TronWeb.address.fromPrivateKey(cleanKey)
  if (!address) {
    throw new Error('Invalid private key')
  }
  return address
}

function assertOwnedRegularFile(filePath: string): void {
  const fileStat = fs.lstatSync(filePath)
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`Refusing to use non-regular secret file: ${filePath}`)
  }

  if (typeof process.getuid === 'function' && fileStat.uid !== process.getuid()) {
    throw new Error(`Refusing to use secret file owned by another user: ${filePath}`)
  }
}

function enforceSecretFilePermissions(filePath: string): void {
  assertOwnedRegularFile(filePath)
  fs.chmodSync(filePath, 0o600)
}

export function readEnvFile(envFile = ENV_FILE): Record<string, string> {
  const env: Record<string, string> = {}
  if (fs.existsSync(envFile)) {
    enforceSecretFilePermissions(envFile)
    const content = fs.readFileSync(envFile, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex)
          const value = trimmed.substring(eqIndex + 1)
          env[key] = value
        }
      }
    }
  }
  return env
}

export function writeEnvFile(env: Record<string, string>, envFile = ENV_FILE): void {
  const lines: string[] = []
  for (const [key, value] of Object.entries(env)) {
    lines.push(`${key}=${value}`)
  }

  if (fs.existsSync(envFile)) {
    assertOwnedRegularFile(envFile)
  }

  const tempPath = path.join(
    path.dirname(envFile),
    `.${path.basename(envFile)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`,
  )
  let fileDescriptor: number | undefined

  try {
    fileDescriptor = fs.openSync(tempPath, 'wx', 0o600)
    fs.writeFileSync(fileDescriptor, lines.join('\n') + '\n', 'utf8')
    fs.fsyncSync(fileDescriptor)
    fs.closeSync(fileDescriptor)
    fileDescriptor = undefined
    fs.renameSync(tempPath, envFile)
    enforceSecretFilePermissions(envFile)
  } catch (error) {
    if (fileDescriptor !== undefined) fs.closeSync(fileDescriptor)
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    throw error
  }
}

async function cmdGenerate(): Promise<void> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new Error('Wallet generation requires an interactive TTY')
  }

  console.log('\nGenerating new wallet...\n')

  const mnemonic = generateMnemonic()
  const { address } = deriveFromMnemonic(mnemonic, 0)

  console.log('='.repeat(60))
  console.log('IMPORTANT: Save this mnemonic phrase securely.')
  console.log('='.repeat(60))
  console.log('\nMnemonic (12 words):')
  console.log(`   ${mnemonic}\n`)
  console.log("Address (m/44'/195'/0'/0/0):")
  console.log(`   ${address}\n`)
  console.log('='.repeat(60))
  console.log('\nStore the mnemonic in agent-wallet, an OS keychain, KMS/HSM, or remote signer.')
  console.log('Do not copy it into shell history or logs. It will not be shown again.\n')
}

async function cmdFromMnemonic(): Promise<void> {
  const session = createPromptSession()

  try {
    console.log('\nDerive wallet from mnemonic\n')

    const mnemonic = await session.promptSecret('Enter your mnemonic (12/24 words): ')
    const indexStr = await session.prompt('Account index [0]: ')
    const accountIndex = indexStr ? parseInt(indexStr, 10) : 0

    if (isNaN(accountIndex) || accountIndex < 0) {
      throw new Error('Invalid account index')
    }

    const { address } = deriveFromMnemonic(mnemonic, accountIndex)

    console.log('\n' + '='.repeat(60))
    console.log(`Derived Address (m/44'/195'/0'/0/${accountIndex}):`)
    console.log(`   ${address}\n`)
    console.log('='.repeat(60))

    const save = await session.prompt('\nSave to .env file? [y/N]: ')
    if (save.toLowerCase() === 'y') {
      const env = readEnvFile()
      delete env.AGENT_WALLET_PRIVATE_KEY
      env.AGENT_WALLET_MNEMONIC = mnemonic
      env.AGENT_WALLET_MNEMONIC_ACCOUNT_INDEX = accountIndex.toString()
      writeEnvFile(env)
      console.log('Saved to .env file')
    }
  } finally {
    session.close()
  }
}

async function cmdFromKey(): Promise<void> {
  const session = createPromptSession()

  try {
    console.log('\nValidate private key\n')

    const privateKey = await session.promptSecret('Enter your private key: ')
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey

    const address = addressFromPrivateKey(cleanKey)

    console.log('\n' + '='.repeat(60))
    console.log('Valid private key')
    console.log(`Address: ${address}\n`)
    console.log('='.repeat(60))

    const save = await session.prompt('\nSave to .env file? [y/N]: ')
    if (save.toLowerCase() === 'y') {
      const env = readEnvFile()
      delete env.AGENT_WALLET_MNEMONIC
      delete env.AGENT_WALLET_MNEMONIC_ACCOUNT_INDEX
      env.AGENT_WALLET_PRIVATE_KEY = cleanKey
      writeEnvFile(env)
      console.log('Saved to .env file')
    }
  } finally {
    session.close()
  }
}

async function cmdShow(): Promise<void> {
  console.log('\nCurrent wallet configuration\n')

  const env = readEnvFile()

  if (env.AGENT_WALLET_PRIVATE_KEY) {
    try {
      const address = addressFromPrivateKey(env.AGENT_WALLET_PRIVATE_KEY)
      console.log('Mode: Private Key')
      console.log(`Address: ${address}`)
      console.log('Private Key: configured (hidden)')
    } catch {
      console.log('Invalid AGENT_WALLET_PRIVATE_KEY in .env')
    }
  } else if (env.AGENT_WALLET_MNEMONIC) {
    try {
      const accountIndex = parseInt(env.AGENT_WALLET_MNEMONIC_ACCOUNT_INDEX || '0', 10)
      const { address } = deriveFromMnemonic(env.AGENT_WALLET_MNEMONIC, accountIndex)
      console.log('Mode: Mnemonic')
      console.log(`Address: ${address}`)
      console.log(`Account Index: ${accountIndex}`)
      console.log('Mnemonic: configured (hidden)')
    } catch {
      console.log('Invalid AGENT_WALLET_MNEMONIC in .env')
    }
  } else {
    console.log('No wallet configured in .env')
    console.log('Run: npx ts-node scripts/setup-env-wallet.ts generate')
  }

  if (env.TRON_GRID_API_KEY) {
    console.log('\nTronGrid API Key: configured (hidden)')
  }

  console.log('')
}

async function cmdSave(): Promise<void> {
  const session = createPromptSession()

  try {
    console.log('\nSave wallet configuration to .env\n')

    const mode = await session.prompt('Mode [1=private key, 2=mnemonic]: ')

    const env = readEnvFile()

    if (mode === '1') {
      const privateKey = await session.promptSecret('Enter private key: ')
      const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
      addressFromPrivateKey(cleanKey)

      delete env.AGENT_WALLET_MNEMONIC
      delete env.AGENT_WALLET_MNEMONIC_ACCOUNT_INDEX
      env.AGENT_WALLET_PRIVATE_KEY = cleanKey
    } else if (mode === '2') {
      const mnemonic = await session.promptSecret('Enter mnemonic: ')
      const indexStr = await session.prompt('Account index [0]: ')
      const accountIndex = indexStr ? parseInt(indexStr, 10) : 0

      deriveFromMnemonic(mnemonic, accountIndex)

      delete env.AGENT_WALLET_PRIVATE_KEY
      env.AGENT_WALLET_MNEMONIC = mnemonic
      env.AGENT_WALLET_MNEMONIC_ACCOUNT_INDEX = accountIndex.toString()
    } else {
      console.log('Invalid mode')
      return
    }

    const apiKey = await session.promptSecret('TronGrid API Key (optional, press Enter to skip): ')
    if (apiKey) {
      env.TRON_GRID_API_KEY = apiKey
    }

    writeEnvFile(env)
    console.log('\nConfiguration saved to .env')

    await cmdShow()
  } finally {
    session.close()
  }
}

function printUsage(): void {
  console.log(`
Usage: npx ts-node scripts/setup-env-wallet.ts [command]

Commands:
  generate       Generate a new mnemonic and show derived address
  from-mnemonic  Derive address from existing mnemonic (interactive)
  from-key       Validate private key and show address (interactive)
  show           Show current wallet configuration from .env
  save           Save wallet configuration to .env (interactive)

Examples:
  npx ts-node scripts/setup-env-wallet.ts generate
  npx ts-node scripts/setup-env-wallet.ts show
  npx ts-node scripts/setup-env-wallet.ts save
`)
}

async function main(): Promise<void> {
  const command = process.argv[2]

  switch (command) {
    case 'generate':
      await cmdGenerate()
      break
    case 'from-mnemonic':
      await cmdFromMnemonic()
      break
    case 'from-key':
      await cmdFromKey()
      break
    case 'show':
      await cmdShow()
      break
    case 'save':
      await cmdSave()
      break
    default:
      printUsage()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
