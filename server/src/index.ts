import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { loadEncryptionKey } from '@/lib/crypto.js'
import { openDb, initSchema } from '@/lib/db.js'
import healthRoute from '@/routes/health.js'
import executeRoute from '@/routes/execute.js'
import staticPlugin from '@/plugins/static.js'

const PORT = Number(process.env.PORT ?? 3001)
const DB_PATH = process.env.DB_PATH ?? 'data/automations.db'

async function main() {
  // 1. Load encryption key — exits with code 1 if key is missing or invalid
  const key = loadEncryptionKey()

  // 2. Open database and initialize schema
  const db = openDb(DB_PATH)
  initSchema(db)

  // 3. Create Fastify instance
  const fastify = Fastify({ logger: true })

  // 4. Register CORS — only needed in dev (Vite runs on different port)
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
  })

  // 5. Register routes — API routes BEFORE @fastify/static
  await fastify.register(healthRoute)
  await fastify.register(executeRoute, { db, key })

  // 6. Normalize Fastify validation errors to { error, detail } shape
  fastify.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: `Invalid request: ${error.message}`,
        detail: JSON.stringify(error.validation),
      })
    }
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Internal server error' })
  })

  // 6b. Static + SPA fallback LAST (catch-all must come after API routes)
  await fastify.register(staticPlugin)

  // 7. Start listening
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
