import fetch from 'node-fetch'
import http from 'node:http'
import https from 'node:https'
import { lookup } from 'node:dns'
import { BlockList, isIP, type LookupFunction } from 'node:net'
import type { LookupAddress } from 'node:dns'
import { safeUrlForLogging } from './logging'

const DEFAULT_FETCH_TIMEOUT_MS = 10000
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_REDIRECTS = 5
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

const nonPublicIpv4Addresses = new BlockList()
nonPublicIpv4Addresses.addSubnet('0.0.0.0', 8, 'ipv4')
nonPublicIpv4Addresses.addSubnet('10.0.0.0', 8, 'ipv4')
nonPublicIpv4Addresses.addSubnet('100.64.0.0', 10, 'ipv4')
nonPublicIpv4Addresses.addSubnet('127.0.0.0', 8, 'ipv4')
nonPublicIpv4Addresses.addSubnet('169.254.0.0', 16, 'ipv4')
nonPublicIpv4Addresses.addSubnet('172.16.0.0', 12, 'ipv4')
nonPublicIpv4Addresses.addSubnet('192.0.0.0', 24, 'ipv4')
nonPublicIpv4Addresses.addSubnet('192.0.2.0', 24, 'ipv4')
nonPublicIpv4Addresses.addSubnet('192.168.0.0', 16, 'ipv4')
nonPublicIpv4Addresses.addSubnet('198.18.0.0', 15, 'ipv4')
nonPublicIpv4Addresses.addSubnet('198.51.100.0', 24, 'ipv4')
nonPublicIpv4Addresses.addSubnet('203.0.113.0', 24, 'ipv4')
nonPublicIpv4Addresses.addSubnet('224.0.0.0', 4, 'ipv4')
nonPublicIpv4Addresses.addSubnet('240.0.0.0', 4, 'ipv4')

const nonPublicIpv6Addresses = new BlockList()
nonPublicIpv6Addresses.addAddress('::', 'ipv6')
nonPublicIpv6Addresses.addAddress('::1', 'ipv6')
nonPublicIpv6Addresses.addSubnet('::', 96, 'ipv6')
nonPublicIpv6Addresses.addSubnet('::ffff:0:0', 96, 'ipv6')
nonPublicIpv6Addresses.addSubnet('::ffff:0:0:0', 96, 'ipv6')
nonPublicIpv6Addresses.addSubnet('64:ff9b::', 96, 'ipv6')
nonPublicIpv6Addresses.addSubnet('64:ff9b:1::', 48, 'ipv6')
nonPublicIpv6Addresses.addSubnet('100::', 64, 'ipv6')
nonPublicIpv6Addresses.addSubnet('2001::', 32, 'ipv6')
nonPublicIpv6Addresses.addSubnet('2001:2::', 48, 'ipv6')
nonPublicIpv6Addresses.addSubnet('2001:10::', 28, 'ipv6')
nonPublicIpv6Addresses.addSubnet('2001:20::', 28, 'ipv6')
nonPublicIpv6Addresses.addSubnet('2001:db8::', 32, 'ipv6')
nonPublicIpv6Addresses.addSubnet('2002::', 16, 'ipv6')
nonPublicIpv6Addresses.addSubnet('fc00::', 7, 'ipv6')
nonPublicIpv6Addresses.addSubnet('fe80::', 10, 'ipv6')
nonPublicIpv6Addresses.addSubnet('fec0::', 10, 'ipv6')
nonPublicIpv6Addresses.addSubnet('ff00::', 8, 'ipv6')

function normalizedHostname(hostname: string): string {
  const withoutBrackets =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname
  return withoutBrackets.endsWith('.') ? withoutBrackets.slice(0, -1) : withoutBrackets
}

function isNonPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return nonPublicIpv4Addresses.check(address, 'ipv4')
  if (family === 6) return nonPublicIpv6Addresses.check(address, 'ipv6')
  return true
}

function lookupAll(hostname: string): Promise<readonly LookupAddress[]> {
  return new Promise((resolve, reject) => {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) reject(error)
      else resolve(addresses)
    })
  })
}

function discardResponseBody(body: unknown): void {
  if (
    typeof body === 'object' &&
    body !== null &&
    'destroy' in body &&
    typeof body.destroy === 'function'
  ) {
    body.destroy()
  }
}

async function createPinnedAgent(parsed: URL): Promise<http.Agent | https.Agent | undefined> {
  if (process.env.ALLOW_PRIVATE_URLS === 'true') return undefined

  const hostname = normalizedHostname(parsed.hostname).toLowerCase()
  if (hostname === 'localhost') throw new Error(`Blocked private/local URL host: ${hostname}`)

  const literalFamily = isIP(hostname)
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookupAll(hostname)

  if (addresses.length === 0) throw new Error(`URL host did not resolve: ${hostname}`)
  if (addresses.some(({ address }) => isNonPublicAddress(address))) {
    throw new Error(`Blocked private/local URL host: ${hostname}`)
  }

  const selected = addresses[0]
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) callback(null, [selected])
    else callback(null, selected.address, selected.family)
  }

  return parsed.protocol === 'https:'
    ? new https.Agent({ lookup: pinnedLookup })
    : new http.Agent({ lookup: pinnedLookup })
}

export interface FetchUrlResult {
  content: string
  finalUrl: string
}

/** Fetches HTTP content and reports the final URL after guarded redirects. */
export async function fetchFromUrlWithMetadata(url: string): Promise<FetchUrlResult> {
  let timeout: NodeJS.Timeout | undefined
  const safeUrl = safeUrlForLogging(url)
  try {
    const timeoutMs = Number(process.env.FETCH_TIMEOUT_MS || DEFAULT_FETCH_TIMEOUT_MS)
    const maxBytes = Number(process.env.FETCH_MAX_BYTES || DEFAULT_MAX_BYTES)
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), timeoutMs)

    let currentUrl = url
    let redirects = 0

    while (true) {
      const parsed = new URL(currentUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Unsupported URL protocol: ${parsed.protocol}`)
      }

      const agent = await createPinnedAgent(parsed)
      try {
        console.error(`Fetching from URL: ${safeUrlForLogging(currentUrl)}`)
        const response = await fetch(currentUrl, {
          agent,
          redirect: 'manual',
          signal: controller.signal,
        })

        if (REDIRECT_STATUSES.has(response.status)) {
          const location = response.headers.get('location')
          discardResponseBody(response.body)
          if (!location) throw new Error(`HTTP ${response.status} redirect without Location`)
          if (redirects >= MAX_REDIRECTS) throw new Error('Too many redirects')
          currentUrl = new URL(location, currentUrl).toString()
          redirects += 1
          continue
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
        }

        const content = await response.text()
        if (content.length > maxBytes) {
          throw new Error(`Response too large: ${content.length} bytes (max ${maxBytes})`)
        }
        console.error(`Successfully fetched ${content.length} bytes from ${safeUrl}`)
        return { content, finalUrl: currentUrl }
      } finally {
        agent?.destroy()
      }
    }
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'Error'
    console.error(`Error fetching from URL ${safeUrl}: ${errorName}`)
    throw new Error(`Remote fetch failed: ${errorName}`)
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

/** Fetches content from an HTTP URL. */
export async function fetchFromUrl(url: string): Promise<string> {
  return (await fetchFromUrlWithMetadata(url)).content
}

/**
 * Checks if a string is an HTTP or HTTPS URL
 * @param urlOrPath String to check
 * @returns True if the string is an HTTP(S) URL, false otherwise
 */
export function isHttpUrl(urlOrPath: string): boolean {
  return urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')
}
