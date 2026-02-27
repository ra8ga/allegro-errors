/**
 * Infisical secrets fetcher — pulls Allegro credentials at runtime.
 * Runs SERVER-SIDE ONLY (inside createServerFn).
 *
 * Required Infisical secrets:
 *   ALLEGRO_CLIENT_ID
 *   ALLEGRO_CLIENT_SECRET
 *   ALLEGRO_REDIRECT_URI
 *
 * Env vars for Infisical connection (set in .env or system env):
 *   INFISICAL_CLIENT_ID
 *   INFISICAL_CLIENT_SECRET
 *   INFISICAL_PROJECT_ID
 *   INFISICAL_ENVIRONMENT  (default: "dev")
 */

import { InfisicalSDK } from '@infisical/sdk'

let cachedClient: InfisicalSDK | null = null

async function getInfisicalClient(): Promise<InfisicalSDK> {
    if (cachedClient) return cachedClient

    const client = new InfisicalSDK({
        siteUrl: 'https://app.infisical.com',
    })

    await client.auth().universalAuth.login({
        clientId: process.env.INFISICAL_CLIENT_ID!,
        clientSecret: process.env.INFISICAL_CLIENT_SECRET!,
    })

    cachedClient = client
    return client
}

export interface AllegroSecrets {
    clientId: string
    clientSecret: string
    redirectUri: string
}

/** Cache secrets for 5 minutes to avoid spamming Infisical */
let secretsCache: { data: AllegroSecrets; expiresAt: number } | null = null

export async function getAllegroSecrets(): Promise<AllegroSecrets> {
    // Check cache first
    if (secretsCache && Date.now() < secretsCache.expiresAt) {
        return secretsCache.data
    }

    const client = await getInfisicalClient()
    const projectId = process.env.INFISICAL_PROJECT_ID!
    const environment = process.env.INFISICAL_ENVIRONMENT ?? 'dev'

    const [clientId, clientSecret, redirectUri] = await Promise.all([
        client.secrets().getSecret({
            secretName: 'ALLEGRO_CLIENT_ID',
            projectId,
            environment,
            secretPath: '/',
        }),
        client.secrets().getSecret({
            secretName: 'ALLEGRO_CLIENT_SECRET',
            projectId,
            environment,
            secretPath: '/',
        }),
        client.secrets().getSecret({
            secretName: 'ALLEGRO_REDIRECT_URI',
            projectId,
            environment,
            secretPath: '/',
        }),
    ])

    const data: AllegroSecrets = {
        clientId: clientId.secretValue,
        clientSecret: clientSecret.secretValue,
        redirectUri: redirectUri.secretValue,
    }

    // Cache for 5 minutes
    secretsCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 }
    return data
}

/** Clear cache (useful when switching environments) */
export function clearSecretsCache() {
    secretsCache = null
    cachedClient = null
}
