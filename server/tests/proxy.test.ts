import { test, expect, vi, afterEach } from 'vitest'
import { callUpstream } from '@/lib/proxy'

afterEach(() => {
  vi.restoreAllMocks()
})

test('callUpstream with mocked fetch returning 200 returns ok result', async () => {
  const mockResponse = {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => '{"result":"ok"}',
  }
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response)

  const result = await callUpstream({
    url: 'https://api.example.com/data',
    method: 'GET',
    headers: {},
    body: undefined,
  })

  expect(result.ok).toBe(true)
  expect(result.status).toBe(200)
  expect(result.body).toBe('{"result":"ok"}')
})

test('callUpstream passes custom headers to fetch (REQ-03)', async () => {
  const mockResponse = {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => '',
  }
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response)

  await callUpstream({
    url: 'https://api.example.com/data',
    method: 'GET',
    headers: { 'X-Api-Key': 'secret', 'X-Custom': 'value' },
    body: undefined,
  })

  const calledHeaders = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>
  expect(calledHeaders['X-Api-Key']).toBe('secret')
  expect(calledHeaders['X-Custom']).toBe('value')
})

test('callUpstream passes body for POST (REQ-04)', async () => {
  const mockResponse = {
    ok: true,
    status: 201,
    headers: new Headers(),
    text: async () => '{"id":1}',
  }
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response)

  await callUpstream({
    url: 'https://api.example.com/items',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"name":"test"}',
  })

  const calledOptions = fetchSpy.mock.calls[0][1]
  expect(calledOptions?.body).toBe('{"name":"test"}')
  expect(calledOptions?.method).toBe('POST')
})

test('callUpstream with TimeoutError returns 502 with "timed out" message', async () => {
  const timeoutError = new Error('The operation was aborted due to timeout')
  timeoutError.name = 'TimeoutError'
  vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(timeoutError)

  const result = await callUpstream({
    url: 'https://api.example.com/slow',
    method: 'GET',
    headers: {},
    body: undefined,
  })

  expect(result.ok).toBe(false)
  expect(result.status).toBe(502)
  expect((result as { ok: false; status: 502; message: string }).message.toLowerCase()).toContain('timed out')
})

test('callUpstream with ECONNREFUSED returns 502 with "connection refused" message', async () => {
  const connError = new Error('connect ECONNREFUSED 127.0.0.1:9999')
  Object.assign(connError, { code: 'ECONNREFUSED' })
  vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(connError)

  const result = await callUpstream({
    url: 'http://localhost:9999/api',
    method: 'GET',
    headers: {},
    body: undefined,
  })

  expect(result.ok).toBe(false)
  expect(result.status).toBe(502)
  expect((result as { ok: false; status: 502; message: string }).message.toLowerCase()).toContain('connection refused')
})

test('callUpstream with ENOTFOUND returns 502 with "hostname not found" message', async () => {
  const dnsError = new Error('getaddrinfo ENOTFOUND no-such-host.invalid')
  Object.assign(dnsError, { code: 'ENOTFOUND' })
  vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(dnsError)

  const result = await callUpstream({
    url: 'https://no-such-host.invalid/api',
    method: 'GET',
    headers: {},
    body: undefined,
  })

  expect(result.ok).toBe(false)
  expect(result.status).toBe(502)
  expect((result as { ok: false; status: 502; message: string }).message.toLowerCase()).toContain('hostname not found')
})
