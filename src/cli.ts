#!/usr/bin/env node

/**
 * Starts the CLI lazily so importing the CLI module does not parse configuration or start I/O.
 */
export async function main(): Promise<void> {
  const { runCli } = await import('./server')
  await runCli()
}

if (require.main === module) {
  main().catch(() => {
    console.error('Error starting server')
    process.exit(1)
  })
}
