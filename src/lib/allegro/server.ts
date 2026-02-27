/**
 * Allegro server functions — TanStack Start createServerFn wrappers.
 * These run server-side only, keeping API keys safe from the client.
 */

import { createServerFn } from '@tanstack/react-start'
import { getAllegroUrls } from './config'
import { getAllegroSecrets } from './secrets'
import {
    allegroFetch,
    isConnected,
    setStoredTokens,
    clearStoredTokens,
    getStoredTokens,
} from './client'

// ─── Connection status ────────────────────────────────────────

export const getConnectionStatus = createServerFn().handler(async () => {
    const tokens = getStoredTokens()
    if (!tokens) {
        return { connected: false as const }
    }

    const now = Math.floor(Date.now() / 1000)
    return {
        connected: true as const,
        expiresAt: tokens.expiresAt,
        expired: tokens.expiresAt < now,
        expiresIn: tokens.expiresAt - now,
    }
})

// ─── OAuth: get login URL ─────────────────────────────────────

export const getOAuthLoginUrl = createServerFn().handler(async () => {
    const secrets = await getAllegroSecrets()
    const urls = getAllegroUrls()

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: secrets.clientId,
        redirect_uri: secrets.redirectUri,
    })

    return { url: `${urls.auth}?${params}` }
})

// ─── OAuth: exchange code for tokens ──────────────────────────

export const exchangeOAuthCode = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => data as { code: string })
    .handler(async ({ data }: { data: { code: string } }) => {
        const secrets = await getAllegroSecrets()
        const urls = getAllegroUrls()

        const res = await fetch(urls.token, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${secrets.clientId}:${secrets.clientSecret}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: data.code,
                redirect_uri: secrets.redirectUri,
            }),
        })

        if (!res.ok) {
            const error = await res.text()
            return { success: false as const, error }
        }

        const tokenData = await res.json() as {
            access_token: string
            refresh_token: string
            expires_in: number
        }

        setStoredTokens({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
        })

        return { success: true as const }
    })

// ─── Disconnect ───────────────────────────────────────────────

export const disconnectAllegro = createServerFn({ method: 'POST' })
    .handler(async () => {
        clearStoredTokens()
        return { success: true }
    })

// ─── Fetch permissions (the real API call) ────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchAllegroPermissions = createServerFn().handler(async (): Promise<{ status: number; body: any }> => {
    if (!isConnected()) {
        return {
            status: 401,
            body: {
                errors: [{ message: 'Not connected to Allegro. Please connect first.', code: 'UNAUTHENTICATED' }],
            },
        }
    }

    try {
        // Fetch user permissions/access from Allegro
        // Uses: GET /me — returns current user info
        const userResult = await allegroFetch('/me')

        if (userResult.status !== 200) {
            return { status: userResult.status, body: userResult.data }
        }

        // Also fetch offer management permissions
        const offersResult = await allegroFetch('/sale/offer-publication-commands')

        // Build a permissions-like response from real data
        const userData = userResult.data as Record<string, unknown>

        return {
            status: 200,
            body: {
                data: [
                    {
                        id: 'user-info',
                        label: 'User Information',
                        status: 'granted' as const,
                        children: [
                            { id: 'user-id', label: `User ID: ${userData.id ?? 'unknown'}`, status: 'granted' as const, children: [] },
                            { id: 'user-login', label: `Login: ${userData.login ?? 'unknown'}`, status: 'granted' as const, children: [] },
                            { id: 'user-email', label: `Email: ${userData.email ?? 'hidden'}`, status: userData.email ? 'granted' as const : 'locked' as const, children: [] },
                        ],
                    },
                    {
                        id: 'offers',
                        label: 'Offer Management',
                        status: offersResult.status === 200 ? 'granted' as const : 'denied' as const,
                        children: [
                            { id: 'offers-read', label: 'Read Offers', status: offersResult.status === 200 ? 'granted' as const : 'denied' as const, children: [] },
                            { id: 'offers-write', label: 'Create Offers', status: offersResult.status === 200 ? 'granted' as const : 'denied' as const, children: [] },
                        ],
                    },
                ],
                errors: offersResult.status !== 200
                    ? [{ message: 'Limited access to offer management', code: 'NO_ACCESS', path: 'data.offers' }]
                    : [],
            },
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)

        if (message === 'NOT_CONNECTED') {
            return {
                status: 401,
                body: { errors: [{ message: 'Not connected to Allegro', code: 'UNAUTHENTICATED' }] },
            }
        }

        if (message.startsWith('TOKEN_REFRESH_FAILED')) {
            return {
                status: 401,
                body: { errors: [{ message: 'Session expired. Please reconnect.', code: 'TOKEN_EXPIRED' }] },
            }
        }

        return {
            status: 500,
            body: { errors: [{ message, code: 'INTERNAL' }] },
        }
    }
})
