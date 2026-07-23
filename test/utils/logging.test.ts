import { safeErrorCode, safeUrlForLogging } from '../../src/utils/logging'

describe('safe logging metadata', () => {
  it('removes URL credentials, query values, and fragments', () => {
    const secretUrl =
      'https://user:password-fixture@example.test/spec.json?token=query-fixture#fragment-fixture'

    expect(safeUrlForLogging(secretUrl)).toBe('https://example.test/spec.json')
  })

  it('does not return malformed URLs or attacker-controlled error codes', () => {
    expect(safeUrlForLogging('not a URL?secret=query-fixture')).toBe('[invalid URL]')
    expect(safeErrorCode('ERR_NETWORK')).toBe('ERR_NETWORK')
    expect(safeErrorCode('bad-code secret-fixture')).toBe('UNKNOWN')
  })
})
