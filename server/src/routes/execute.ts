import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import type Database from 'better-sqlite3'
import {
  ExecuteBody,
  type ExecuteBodyType,
  ExecuteResponse,
  ErrorResponse,
} from '@/schemas/execute.js'
import { callUpstream } from '@/lib/proxy.js'

interface ExecutePluginOptions {
  db?: Database.Database
  key?: Buffer
}

const executePlugin: FastifyPluginAsync<ExecutePluginOptions> = async (
  fastify,
  _opts,
) => {
  fastify.post<{ Body: ExecuteBodyType }>(
    '/api/execute',
    {
      schema: {
        body: ExecuteBody,
        response: {
          200: ExecuteResponse,
          400: ErrorResponse,
          502: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { url, method, headers = {}, body, apiKey } = request.body

      // If apiKey provided, inject as Authorization: Bearer
      // Phase 3 will add AI placement logic
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const result = await callUpstream(url, method, headers, body)

      if (!result.ok) {
        return reply.status(502).send({
          error: result.message,
          detail: result.detail,
        })
      }

      return reply.status(200).send({
        status: result.status,
        headers: result.headers,
        body: result.body,
      })
    },
  )
}

export default fp(executePlugin)

/**
 * buildApp creates a self-contained Fastify instance with the execute route
 * registered and a validation error normalizer. Used by tests via inject().
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false })

  // Normalize Fastify validation errors to { error, detail } shape
  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: `Invalid request: ${error.message}`,
        detail: JSON.stringify(error.validation),
      })
    }
    return reply.status(500).send({ error: 'Internal server error' })
  })

  app.post<{ Body: ExecuteBodyType }>(
    '/api/execute',
    {
      schema: {
        body: ExecuteBody,
        response: {
          200: ExecuteResponse,
          400: ErrorResponse,
          502: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { url, method, headers = {}, body, apiKey } = request.body

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const result = await callUpstream(url, method, headers, body)

      if (!result.ok) {
        return reply.status(502).send({
          error: result.message,
          detail: result.detail,
        })
      }

      return reply.status(200).send({
        status: result.status,
        headers: result.headers,
        body: result.body,
      })
    },
  )

  return app
}
