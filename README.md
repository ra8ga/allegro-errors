# Allegro Permissions — API Validation Demo

Demonstracja walidacji i normalizacji odpowiedzi REST API.  
Standalone pakiet `@validation-tool` obsługuje **dowolny** format response — od happy path po HTML error pages.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000/permissions
npm run test       # 44 testy
```

## Co jest w środku

- **`packages/validation-tool/`** — standalone pakiet walidacji (9 modułów, 44 testy, zero zależności)
- **`src/mocks/`** — MSW handlers symulujące 10+ scenariuszy odpowiedzi API
- **`src/lib/allegro/`** — architektura integracji z prawdziwym API (Infisical + OAuth + token refresh)
- **`src/routes/permissions.tsx`** — interaktywne demo z drzewkiem uprawnień

## Docs

Pełna dokumentacja w [`docs/`](./docs/):
- [Validation Tool](./docs/validation-tool.md) — pipeline, typy, schema validation, helpers
- [Architektura](./docs/architecture.md) — real API integration, Infisical, security model

## Stack

TanStack Start · React 19 · MSW 2 · Vitest · Tailwind v4 · Infisical SDK
