import { test, expect, vi, afterEach } from 'vitest'

// We import the Fastify app builder from the routes module
// This will fail with "Cannot find module" until Plan 02 implements it — that is the intended RED state
import { buildApp } from '@/routes/execute'

afterEach(() => {
  vi.restoreAllMocks()
})

test('POST /api/execute with missing url returns 400 (REQ-01)', async () => {
  const app = buildApp()
  const response = await app.inject({
    method: 'POST',
    url: '/api/execute',
    payload: {
      // url omitted
      method: 'GET',
    },
  })

  expect(response.statusCode).toBe(400)
  const body = JSON.parse(response.body)
  expect(typeof body.error).toBe('string')
  expect(body.error.length).toBeGreaterThan(0)
})

test('POST /api/execute with unsupported method "CONNECT" returns 400 (REQ-02)', async () => {
  const app = buildApp()
  const response = await app.inject({
    method: 'POST',
    url: '/api/execute',
    payload: {
      url: 'https://api.example.com',
      method: 'CONNECT',
    },
  })

  expect(response.statusCode).toBe(400)
  const body = JSON.parse(response.body)
  expect(typeof body.error).toBe('string')
})

test('POST /api/execute with valid payload delegates to callUpstream and returns upstream status (REQ-06)', async () => {
  vi.mock('@/lib/proxy', () => ({
    callUpstream: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"hello":"world"}',
    }),
  }))

  const app = buildApp()
  const response = await app.inject({
    method: 'POST',
    url: '/api/execute',
    payload: {
      url: 'https://api.example.com/data',
      method: 'GET',
      headers: {},
    },
  })

  expect(response.statusCode).toBe(200)
})
