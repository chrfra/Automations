export type ProxyResult =
  | { ok: true; status: number; headers: Record<string, string>; body: string }
  | { ok: false; status: 502; message: string; detail: string }

interface CallUpstreamOptions {
  url: string
  method: string
  headers: Record<string, string>
  body: string | undefined
}

export async function callUpstream(options: CallUpstreamOptions): Promise<ProxyResult>
export async function callUpstream(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
): Promise<ProxyResult>
export async function callUpstream(
  urlOrOptions: string | CallUpstreamOptions,
  method?: string,
  headers?: Record<string, string>,
  body?: string | undefined,
): Promise<ProxyResult> {
  let resolvedUrl: string
  let resolvedMethod: string
  let resolvedHeaders: Record<string, string>
  let resolvedBody: string | undefined

  if (typeof urlOrOptions === 'object') {
    resolvedUrl = urlOrOptions.url
    resolvedMethod = urlOrOptions.method
    resolvedHeaders = urlOrOptions.headers
    resolvedBody = urlOrOptions.body
  } else {
    resolvedUrl = urlOrOptions
    resolvedMethod = method!
    resolvedHeaders = headers!
    resolvedBody = body
  }

  try {
    const response = await fetch(resolvedUrl, {
      method: resolvedMethod,
      headers: resolvedHeaders,
      body: resolvedBody,
      signal: AbortSignal.timeout(30_000),
    })

    const responseBody = await response.text()
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    return {
      ok: true,
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    }
  } catch (err: unknown) {
    const error = err as Error & { code?: string; name?: string }

    // Timeout detection: check both error name and undici error code
    if (
      error.name === 'TimeoutError' ||
      error.code === 'UND_ERR_CONNECT_TIMEOUT'
    ) {
      return {
        ok: false,
        status: 502,
        message: 'Request timed out',
        detail: error.message,
      }
    }

    if (error.code === 'ECONNREFUSED') {
      return {
        ok: false,
        status: 502,
        message: 'Connection refused',
        detail: error.message,
      }
    }

    if (error.code === 'ENOTFOUND') {
      return {
        ok: false,
        status: 502,
        message: 'Hostname not found',
        detail: error.message,
      }
    }

    if (error.code === 'ECONNRESET') {
      return {
        ok: false,
        status: 502,
        message: 'Connection reset',
        detail: error.message,
      }
    }

    return {
      ok: false,
      status: 502,
      message: 'Upstream error',
      detail: error.message,
    }
  }
}
