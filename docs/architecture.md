# Architektura — Real API Integration

> ⚠️ Sandbox Allegro tymczasowo niedostępny. Poniższa architektura jest zaimplementowana i gotowa (`src/lib/allegro/`).

## Schemat

```
┌─────────────────────┐
│   Browser (React)   │
│                     │
│   Toggle: Mock/Real │
└────────┬────────────┘
         │ createServerFn()
         ▼
┌─────────────────────┐
│   TanStack Start    │          ┌──────────────┐
│   Server Functions  │─────────►│   Infisical  │
│                     │  secrets │   (SDK)      │
│   src/lib/allegro/  │          └──────────────┘
│   server.ts         │
└────────┬────────────┘
         │ fetch + Bearer token
         ▼
┌─────────────────────┐
│   Allegro REST API  │
│   (sandbox / prod)  │
└─────────────────────┘
```

## Moduły

### `config.ts` — URL Toggle
```typescript
// Automatycznie na podstawie ALLEGRO_ENV env var
const urls = getAllegroUrls()  // sandbox domyślnie
```

| Środowisko | Auth URL | API URL |
|---|---|---|
| sandbox | `allegro.pl.allegrosandbox.pl/...` | `api.allegro.pl.allegrosandbox.pl` |
| production | `allegro.pl/...` | `api.allegro.pl` |

### `secrets.ts` — Infisical SDK
- Pobiera `ALLEGRO_CLIENT_ID`, `ALLEGRO_CLIENT_SECRET`, `ALLEGRO_REDIRECT_URI`
- Cache 5 minut
- Wymaga: `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`

### `client.ts` — Authenticated Fetch
- `allegroFetch(endpoint, options)` — główna funkcja
- Auto refresh token 60s przed wygaśnięciem
- Retry na 401 z nowym tokenem
- Zwraca `{ status, data }` — **nie rzuca wyjątków** na błędy API
- Validation-tool normalizuje wynik

### `server.ts` — Server Functions
| Funkcja | Opis |
|---|---|
| `getConnectionStatus()` | Sprawdza czy są tokeny i czy ważne |
| `getOAuthLoginUrl()` | Buduje URL do logowania Allegro |
| `exchangeOAuthCode(code)` | Wymienia code na access/refresh token |
| `disconnectAllegro()` | Czyści tokeny |
| `fetchAllegroPermissions()` | Pobiera /me + /sale/... → buduje drzewko |

## Bezpieczeństwo

- **Klucze API nigdy nie trafiają do klienta** — `createServerFn` gwarantuje server-side execution
- **Sandbox domyślnie** — mniej ryzyka
- **Infisical** — sekrety nie w kodzie, nie w .env
- **Oddzielne credentials** sandbox vs prod — rekruter nie ma dostępu do produkcji
