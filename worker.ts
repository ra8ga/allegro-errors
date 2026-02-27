import server from './dist/server/index.mjs'

type AssetsBinding = {
    fetch(request: Request): Promise<Response>
}

type Env = {
    ASSETS: AssetsBinding
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const response = await handleRequest(request, env)
        const newHeaders = new Headers(response.headers)
        newHeaders.set('X-Robots-Tag', 'noindex, nofollow, noai, noimageai')

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
        })
    },
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/robots.txt' && request.method === 'GET') {
        return new Response('User-agent: *\nDisallow: /', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        })
    }

    // Try static assets first
    if (request.method === 'GET') {
        try {
            const assetHeaders = new Headers(request.headers)
            assetHeaders.set('Accept-Encoding', 'identity')
            const assetRequest = new Request(request, { headers: assetHeaders })
            const assetResponse = await env.ASSETS.fetch(assetRequest)
            if (assetResponse && assetResponse.status !== 404) {
                return assetResponse
            }
        } catch (e) {
            console.error('ASSETS Error:', e)
        }
    }

    // SSR fallback
    try {
        const ssrPromise = (async () => {
            const res = await server.fetch(request, env)
            const headers = new Headers(res.headers)
            headers.delete('content-encoding')
            const text = await res.text()
            return new Response(text, { status: res.status, headers })
        })()
        const timeoutPromise = new Promise<Response>((resolve) =>
            setTimeout(() => resolve(new Response('Gateway Timeout', { status: 504 })), 15000),
        )
        return await Promise.race([ssrPromise, timeoutPromise])
    } catch (err) {
        console.error('SSR Error:', err)
        return new Response('Internal Error', { status: 500 })
    }
}
