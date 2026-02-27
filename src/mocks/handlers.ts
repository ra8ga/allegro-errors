import { http, HttpResponse } from 'msw'
import { fixtures } from './fixtures'

export const handlers = [
    http.get('/api/permissions', ({ request }) => {
        const url = new URL(request.url)
        const scenario = url.searchParams.get('scenario') || 'success-full'
        const fixture = fixtures[scenario]

        if (!fixture) {
            return HttpResponse.json(
                { error: { code: 'NOT_FOUND', message: `Unknown scenario: ${scenario}` } },
                { status: 404 },
            )
        }

        if (typeof fixture.body === 'string') {
            return new HttpResponse(fixture.body, {
                status: fixture.status,
                headers: { 'Content-Type': 'text/plain' },
            })
        }

        return HttpResponse.json(fixture.body, { status: fixture.status })
    }),
]
