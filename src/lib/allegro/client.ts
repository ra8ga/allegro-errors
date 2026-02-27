/**
 * Allegro API client — authenticated fetch with token refresh.
 * Runs SERVER-SIDE ONLY.
 *
 * Token lifecycle:
 *   1. First call → no tokens → throw "NOT_CONNECTED"
 *   2. After OAuth callback → tokens stored in memory (single-tenant demo)
 *   3. On 401 or near-expiry → auto-refresh via refresh_token
 */

import { getAllegroUrls, ALLEGRO_ACCEPT, type AllegroEnv } from './config'
import { getAllegroSecrets } from './secrets'

// ─── Token storage (in-memory, single-tenant demo) ────────────

interface TokenData {
    accessToken: string
    refreshToken: string
    expiresAt: number  // unix seconds
}

let storedTokens: TokenData | null = null

export function getStoredTokens() { return storedTokens }
export function setStoredTokens(tokens: TokenData) { storedTokens = tokens }
export function clearStoredTokens() { storedTokens = null }

export function isConnected(): boolean {
    return storedTokens !== null
}

// ─── Token refresh ────────────────────────────────────────────

async function refreshAccessToken(env?: AllegroEnv): Promise<TokenData> {
    if (!storedTokens?.refreshToken) {
        throw new Error('NOT_CONNECTED')
    }

    const urls = getAllegroUrls(env)
    const secrets = await getAllegroSecrets()

    const res = await fetch(urls.token, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${btoa(`${secrets.clientId}:${secrets.clientSecret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: storedTokens.refreshToken,
        }),
    })

    if (!res.ok) {
        // Refresh failed → force re-login
        clearStoredTokens()
        const errorText = await res.text()
        throw new Error(`TOKEN_REFRESH_FAILED: ${errorText}`)
    }

    const data = await res.json() as {
        access_token: string
        refresh_token: string
        expires_in: number
    }

    const newTokens: TokenData = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    }

    storedTokens = newTokens
    return newTokens
}

// ─── Authenticated fetch ──────────────────────────────────────

async function getValidToken(env?: AllegroEnv): Promise<string> {
    if (!storedTokens) {
        throw new Error('NOT_CONNECTED')
    }

    const now = Math.floor(Date.now() / 1000)
    // Refresh 60s before expiry
    if (storedTokens.expiresAt - now < 60) {
        const refreshed = await refreshAccessToken(env)
        return refreshed.accessToken
    }

    return storedTokens.accessToken
}

export interface AllegroFetchOptions {
    method?: string
    body?: unknown
    env?: AllegroEnv
}

/**
 * Make an authenticated request to Allegro REST API.
 * Auto-refreshes token if near expiry.
 * Returns { status, data } — does NOT throw on API errors so validation-tool can normalize them.
 */
export async function allegroFetch<T = unknown>(
    endpoint: string,
    options: AllegroFetchOptions = {},
): Promise<{ status: number; data: T }> {
    const urls = getAllegroUrls(options.env)
    const token = await getValidToken(options.env)

    const fetchOptions: RequestInit = {
        method: options.method ?? 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': ALLEGRO_ACCEPT,
            'Content-Type': ALLEGRO_ACCEPT,
        },
    }

    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body)
    }

    const response = await fetch(`${urls.api}${endpoint}`, fetchOptions)

    let data: T
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json') || contentType.includes('allegro')) {
        data = await response.json() as T
    } else {
        data = await response.text() as unknown as T
    }

    // If 401, try refresh once, then retry
    if (response.status === 401 && storedTokens?.refreshToken) {
        try {
            await refreshAccessToken(options.env)
            return allegroFetch(endpoint, options) // retry with new token
        } catch {
            // Refresh failed — return 401 as-is
        }
    }

    return { status: response.status, data }
}
