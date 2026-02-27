/**
 * Barrel export for Allegro integration.
 */

// Config
export { getAllegroUrls, ALLEGRO_ACCEPT, type AllegroEnv } from './config'

// Client (server-side only)
export { allegroFetch, isConnected, setStoredTokens, clearStoredTokens, getStoredTokens } from './client'

// Secrets (server-side only)
export { getAllegroSecrets, clearSecretsCache } from './secrets'

// Server functions (callable from client)
export {
    getConnectionStatus,
    getOAuthLoginUrl,
    exchangeOAuthCode,
    disconnectAllegro,
    fetchAllegroPermissions,
} from './server'
