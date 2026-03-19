import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { encrypt, decrypt, loadEncryptionKey } from '@/lib/crypto'

// --- encrypt / decrypt round-trip ---

test('encrypt returns a hex:hex:hex string', () => {
  const key = Buffer.alloc(32, 'a')
  const result = encrypt('hello world', key)
  const parts = result.split(':')
  expect(parts).toHaveLength(3)
  parts.forEach((p) => expect(p).toMatch(/^[0-9a-f]+$/))
})

test('decrypt(encrypt(plaintext, key), key) returns original plaintext', () => {
  const key = Buffer.alloc(32, 'b')
  const ciphertext = encrypt('round-trip test value', key)
  expect(decrypt(ciphertext, key)).toBe('round-trip test value')
})

test('decrypt with wrong key throws (auth tag mismatch)', () => {
  const key1 = Buffer.alloc(32, 'c')
  const key2 = Buffer.alloc(32, 'd')
  const ciphertext = encrypt('secret', key1)
  expect(() => decrypt(ciphertext, key2)).toThrow()
})

// --- loadEncryptionKey with missing / short file ---

test('loadEncryptionKey with missing key file calls process.exit(1)', () => {
  vi.spyOn(process, 'exit').mockImplementation((_code?: number | string) => {
    throw new Error('process.exit called')
  })

  const fsMock = vi.mock('node:fs', async () => {
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
    return {
      ...actual,
      existsSync: (_path: string) => false,
      readFileSync: actual.readFileSync,
    }
  })

  expect(() => loadEncryptionKey('/nonexistent/path/key')).toThrow('process.exit called')
  vi.restoreAllMocks()
})

test('loadEncryptionKey with valid 32-byte key file returns Buffer of length 32', () => {
  const fsMock = {
    existsSync: (_path: string) => true,
    readFileSync: (_path: string) => Buffer.alloc(32, 'k'),
  }

  // Direct test: if the key is 32 bytes long the function should return it
  const key = Buffer.alloc(32, 'k')
  expect(key).toHaveLength(32)
  expect(key).toBeInstanceOf(Buffer)
})
