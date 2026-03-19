import { test, expect, vi, afterEach } from 'vitest'
import { loadEncryptionKey } from '@/lib/crypto'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

test('loadEncryptionKey when key file is missing calls process.exit(1)', () => {
  vi.spyOn(process, 'exit').mockImplementation((_code?: number | string) => {
    throw new Error('process.exit called')
  })

  vi.mock('node:fs', async () => {
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
    return {
      ...actual,
      existsSync: (_path: string) => false,
    }
  })

  expect(() => loadEncryptionKey('/nonexistent/key')).toThrow('process.exit called')
})

test('loadEncryptionKey with key shorter than 32 bytes calls process.exit(1)', () => {
  vi.spyOn(process, 'exit').mockImplementation((_code?: number | string) => {
    throw new Error('process.exit called')
  })

  vi.mock('node:fs', async () => {
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
    return {
      ...actual,
      existsSync: (_path: string) => true,
      readFileSync: (_path: string) => Buffer.alloc(16, 'x'), // only 16 bytes — too short
    }
  })

  expect(() => loadEncryptionKey('/path/to/short-key')).toThrow('process.exit called')
})
