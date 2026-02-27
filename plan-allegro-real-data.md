# Plan: Realne dane z Allegro API

## Cel

Umożliwienie przełączania między **MSW (mock)** a **prawdziwym API Allegro** — bez ujawniania kluczy w kodzie/repo.

---

## Architektura

```
Browser (React)
  │
  ▼
/api/allegro/permissions  ← TanStack Start server route (SSR)
  │
  ├── Infisical SDK → pobiera ALLEGRO_CLIENT_ID + ALLEGRO_CLIENT_SECRET
  │
  ▼
https://api.allegro.pl/...  ← prawdziwe API Allegro
  │
  ▼
Response → normalizacja przez error-kit → frontend
```

**Kluczowa zasada:** Secret nigdy nie trafia do przeglądarki. Wszystko dzieje się server-side.

---

## Kroki implementacji

### 1. Zapisanie secretów w Infisical

Projekt: np. `allegro-access-demo`  
Środowisko: `dev`  
Sekrety:
- `ALLEGRO_CLIENT_ID` — Client ID z apps.developer.allegro.pl
- `ALLEGRO_CLIENT_SECRET` — Client Secret
- `ALLEGRO_API_URL` — `https://api.allegro.pl` (prod) lub `https://api.allegro.pl.allegrosandbox.pl` (sandbox)

### 2. SDK Infisical po stronie serwera

```bash
npm install @infisical/sdk
```

Plik: `src/lib/infisical.ts`
```ts
import { InfisicalSDK } from '@infisical/sdk'

let client: InfisicalSDK | null = null

export async function getSecret(key: string): Promise<string> {
  if (!client) {
    client = new InfisicalSDK({ siteUrl: 'https://app.infisical.com' })
    await client.auth().universalAuth.login({
      clientId: process.env.INFISICAL_CLIENT_ID!,
      clientSecret: process.env.INFISICAL_CLIENT_SECRET!,
    })
  }
  const secret = await client.secrets().getSecret({
    projectId: process.env.INFISICAL_PROJECT_ID!,
    environment: 'dev',
    secretName: key,
    secretPath: '/',
  })
  return secret.secretValue
}
```

> **Uwaga:** `INFISICAL_CLIENT_ID` i `INFISICAL_CLIENT_SECRET` to jedyne sekrety w `.env` — reszta jest w Infisical.

### 3. Server-side API route

Plik: `src/routes/api/allegro/permissions.ts`
```ts
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { getSecret } from '@/lib/infisical'

export const Route = createAPIFileRoute('/api/allegro/permissions')({
  GET: async ({ request }) => {
    try {
      // 1. Pobierz token z Allegro (Client Credentials flow)
      const clientId = await getSecret('ALLEGRO_CLIENT_ID')
      const clientSecret = await getSecret('ALLEGRO_CLIENT_SECRET')
      const apiUrl = await getSecret('ALLEGRO_API_URL')

      const tokenRes = await fetch('https://allegro.pl/auth/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      })
      const { access_token } = await tokenRes.json()

      // 2. Odpytaj Allegro API
      const dataRes = await fetch(`${apiUrl}/sale/offer-permissions`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const data = await dataRes.json()

      // 3. Zwróć dane (klucz NIGDY nie trafia do przeglądarki)
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch from Allegro API',
        message: err instanceof Error ? err.message : String(err),
      }), { status: 502 })
    }
  }
})
```

### 4. Przełącznik w UI: Mock vs Real

W `permissions.tsx` dodać toggle:
```tsx
const [dataSource, setDataSource] = useState<'mock' | 'real'>('mock')

const endpoint = dataSource === 'mock'
  ? `/api/permissions?scenario=${scenario}`
  : `/api/allegro/permissions`
```

W interfejsie — prosty switch/toggle obok scenario switchera.

### 5. `.env.local` (gitignored)

```env
# Tylko te 3 wartości lokalnie — reszta w Infisical
INFISICAL_CLIENT_ID=your-machine-identity-client-id
INFISICAL_CLIENT_SECRET=your-machine-identity-client-secret
INFISICAL_PROJECT_ID=your-project-id
```

---

## Bezpieczeństwo

| Warstwa | Ochrona |
|---------|---------|
| **Kod źródłowy** | Zero secretów w repo |
| **Frontend** | Nie widzi kluczy — odpytuje server route |
| **Server route** | Pobiera sekrety z Infisical w runtime |
| **Infisical** | Machine Identity z ograniczonym scope |
| **Allegro OAuth** | Client Credentials — token ważny krótko |

---

## Alternatywa: Cloudflare Worker

Jeśli nie chcemy SSR, można postawić osobnego Workera:
- Worker jako proxy → env vars z dashboardu CF
- Frontend odpytuje `https://allegro-proxy.workers.dev/permissions`
- Zaleta: działa niezależnie od frontu
- Wada: osobny deploy, CORS do ogarnięcia

**Rekomendacja: opcja z TanStack Start server route** — zero dodatkowej infrastruktury.

---

## Potrzebne z Allegro Developer Portal

1. Zarejestruj aplikację na [apps.developer.allegro.pl](https://apps.developer.allegro.pl)
2. Skopiuj `Client ID` i `Client Secret`
3. Upewnij się, że masz odpowiednie uprawnienia (offer management, user data itp.)
4. Wybierz environment: sandbox vs production
