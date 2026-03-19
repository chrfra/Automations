import 'dotenv/config'
import Fastify from 'fastify'
import { loadEncryptionKey } from '@/lib/crypto.js'
import { openDb, initSchema } from '@/lib/db.js'

const PORT = Number(process.env.PORT ?? 3001)
const DB_PATH = process.env.DB_PATH ?? 'data/automations.db'

async function main() {
  // Load encryption key — exits with code 1 if key is missing or invalid
  const _key = loadEncryptionKey()

  // Open database and initialize schema
  const db = openDb(DB_PATH)
  initSchema(db)

  // Create Fastify instance
  const fastify = Fastify({ logger: true })

  // Health check
  fastify.get('/api/health', async (_req, _reply) => {
    return { status: 'ok' }
  })

  // Routes will be registered in Plan 03
  // fastify.register(import('@/routes/execute.js').then(m => m.default))

  // Start server
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
