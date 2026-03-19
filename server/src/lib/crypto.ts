import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96-bit — NIST recommendation for GCM
const TAG_LENGTH = 16  // 128-bit auth tag

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(stored: string, key: Buffer): string {
  const parts = stored.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, tagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

export function loadEncryptionKey(keyPath?: string): Buffer {
  const resolvedPath = keyPath ?? (process.env.KEY_PATH ?? 'data/secrets/key')

  if (!existsSync(resolvedPath)) {
    console.error(`[crypto] Key file not found: ${resolvedPath}`)
    process.exit(1)
  }

  const raw = readFileSync(resolvedPath)

  // Accept either 64-char hex string (most common) or raw 32-byte binary
  let key: Buffer
  if (raw.length === 64) {
    // Hex-encoded 32-byte key
    key = Buffer.from(raw.toString('utf8').trim(), 'hex')
  } else if (raw.length === 32) {
    // Raw binary 32-byte key
    key = Buffer.from(raw)
  } else {
    console.error(`[crypto] Key must be 32 raw bytes or 64 hex chars — got ${raw.length} bytes`)
    process.exit(1)
  }

  if (key.length !== 32) {
    console.error(`[crypto] Decoded key length is ${key.length}, expected 32`)
    process.exit(1)
  }

  // Self-test: encrypt then decrypt a known value
  try {
    const testPlain = 'key-self-test'
    const ciphertext = encrypt(testPlain, key)
    const decrypted = decrypt(ciphertext, key)
    if (decrypted !== testPlain) throw new Error('Round-trip mismatch')
  } catch (err) {
    console.error('[crypto] Key self-test failed:', err)
    process.exit(1)
  }

  return key
}
