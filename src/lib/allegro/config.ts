/**
 * Allegro API configuration — env-based toggle sandbox/production
 */

export type AllegroEnv = 'sandbox' | 'production'

const URLS = {
    sandbox: {
        auth: 'https://allegro.pl.allegrosandbox.pl/auth/oauth/authorize',
        token: 'https://allegro.pl.allegrosandbox.pl/auth/oauth/token',
        api: 'https://api.allegro.pl.allegrosandbox.pl',
    },
    production: {
        auth: 'https://allegro.pl/auth/oauth/authorize',
        token: 'https://allegro.pl/auth/oauth/token',
        api: 'https://api.allegro.pl',
    },
} as const

export function getAllegroUrls(env?: AllegroEnv) {
    const resolved = env ?? (process.env.ALLEGRO_ENV as AllegroEnv) ?? 'sandbox'
    return URLS[resolved]
}

/** Content-Type / Accept header required by Allegro REST API */
export const ALLEGRO_ACCEPT = 'application/vnd.allegro.public.v1+json'
