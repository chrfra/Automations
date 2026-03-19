import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/health', async () => ({ status: 'ok' }))
}

export default fp(healthRoute)
