/**
 * Returns URL metadata that is safe for logs by removing userinfo, query, and fragment data.
 */
export function safeUrlForLogging(value: string): string {
  try {
    const parsed = new URL(value)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return '[invalid URL]'
  }
}

/**
 * Returns a bounded transport error code without logging attacker-controlled error messages.
 */
export function safeErrorCode(value: unknown): string {
  return typeof value === 'string' && /^[A-Z0-9_]{1,64}$/.test(value) ? value : 'UNKNOWN'
}
