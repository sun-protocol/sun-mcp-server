'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const repositoryRoot = path.resolve(__dirname, '..')
const packageJson = require(path.join(repositoryRoot, 'package.json'))
const packageLock = require(path.join(repositoryRoot, 'package-lock.json'))
const policy = require(path.join(repositoryRoot, 'security/dependency-overrides.json'))

function installedVersions(packageName) {
  return Object.entries(packageLock.packages)
    .filter(([location]) => location.endsWith(`node_modules/${packageName}`))
    .map(([, entry]) => entry.version)
}

function major(version) {
  return Number(version.split('.')[0])
}

assert.equal(policy.schemaVersion, 1, 'unsupported dependency override policy schema')
assert(policy.owner && typeof policy.owner === 'string', 'override policy must have an owner')
assert.match(policy.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, 'reviewedAt must be an ISO date')
assert.match(policy.reviewBy, /^\d{4}-\d{2}-\d{2}$/, 'reviewBy must be an ISO date')
assert(
  Date.now() <= Date.parse(`${policy.reviewBy}T23:59:59.999Z`),
  `dependency overrides expired on ${policy.reviewBy}`,
)
assert(Array.isArray(policy.resolutions) && policy.resolutions.length > 0, 'missing resolutions')

const seenSelectors = new Set()
for (const resolution of policy.resolutions) {
  assert(!seenSelectors.has(resolution.selector), `duplicate selector: ${resolution.selector}`)
  seenSelectors.add(resolution.selector)
  assert.equal(
    packageJson.overrides?.[resolution.selector],
    resolution.version,
    `${resolution.selector} override does not match the reviewed version`,
  )
  assert(
    Array.isArray(resolution.advisories) && resolution.advisories.length > 0,
    `${resolution.selector} is missing advisory IDs`,
  )
  assert(resolution.reachability, `${resolution.selector} is missing reachability evidence`)
  assert(resolution.removalCondition, `${resolution.selector} is missing a removal condition`)

  const versions = installedVersions(resolution.package).filter(
    (version) => resolution.major === undefined || major(version) === resolution.major,
  )
  assert(versions.length > 0, `${resolution.package} is not present in package-lock.json`)
  assert.deepEqual(
    [...new Set(versions)],
    [resolution.version],
    `${resolution.selector} resolved to an unreviewed version: ${versions.join(', ')}`,
  )
}

assert.deepEqual(
  Object.keys(packageJson.overrides || {}).sort(),
  [...seenSelectors].sort(),
  'package.json contains an undocumented security override',
)
assert(!packageJson.dependencies['@sun-protocol/permit2-sdk'], 'redundant direct Permit2 SDK dependency')
assert(
  !packageJson.dependencies['@sun-protocol/universal-router-sdk'],
  'redundant direct Universal Router SDK dependency',
)

const jaysonGenerateRequest = require('jayson/lib/generateRequest')
const request = jaysonGenerateRequest('health', {})
assert.match(request.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

const BN = require('bn.js')
assert.equal(new BN('ffffffff', 16).addn(1).toString(16), '100000000')

const bodyParser = require('body-parser')
assert.equal(typeof bodyParser.json({ limit: '1mb' }), 'function')

const { getRequestListener } = require('@hono/node-server')
assert.equal(typeof getRequestListener, 'function')

const fastUri = require('fast-uri')
assert.match(
  fastUri.parse('http://evil.com\\@allowed.com').error,
  /literal backslash/i,
  'fast-uri must reject host-confusion inputs before URL consumers normalize them',
)

const { TronWeb } = require('tronweb')
assert.equal(TronWeb.isAddress('T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'), true)

const sunKit = require('@sun-protocol/sun-kit')
assert.equal(typeof sunKit.SunKit, 'function')
assert.equal(typeof sunKit.SunAPI, 'function')

const ethers = require('ethers')
assert.equal(typeof ethers.WebSocketProvider, 'function')

process.stdout.write(
  `Verified ${policy.resolutions.length} reviewed production overrides through ${policy.reviewBy}.\n`,
)
