import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const staticPlugin: FastifyPluginAsync = async (fastify) => {
  if (process.env.NODE_ENV !== 'production') return
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '../client/dist'),
    prefix: '/',
  })
  fastify.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html')
  })
}

export default fp(staticPlugin)
