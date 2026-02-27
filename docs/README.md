# Allegro Permissions — Validation Tool Demo

Demonstracja architektury walidacji i normalizacji odpowiedzi API.  
Projekt pokazuje jak bezpiecznie obsługiwać **dowolny** format odpowiedzi z backendu — od happy path po kompletnie niespodziewane kształty danych.

## Quick Start

```bash
cd allegro
npm install
npm run dev        # http://localhost:3000/permissions
npm run test       # 44 testy
```

## Co to robi?

1. **Mock Service Worker (MSW)** symuluje 10+ scenariuszy odpowiedzi API
2. **Validation-tool** (`packages/validation-tool/`) normalizuje dowolny response do jednego formatu
3. **UI** renderuje wynik — drzewko uprawnień, bannery błędów, debug panel

## Architektura

```
┌─────────────┐    fetch    ┌──────────┐    parseApiResponse()    ┌──────────────┐
│  Frontend   │───────────►│  MSW /   │──────────────────────────►│  validation  │
│  (React)    │            │  API     │                           │  -tool       │
└─────────────┘            └──────────┘                           └──────┬───────┘
                                                                         │
                                                                    ApiResult<T>
                                                                         │
                                                          ┌──────────────┴──────────────┐
                                                          │  kind: success|partial|fail  │
                                                          │  data: T | null             │
                                                          │  errors: NormalizedError[]   │
                                                          └─────────────────────────────┘
```

## Stack

| Technologia | Rola |
|---|---|
| TanStack Start + Router | Framework, SSR |
| MSW 2.x | Mock API na Service Worker |
| Vitest | Testy |
| Tailwind CSS v4 | Styling |
| Infisical SDK | Zarządzanie sekretami (przygotowane) |

## Struktura projektu

```
allegro/
├── packages/validation-tool/    ← standalone walidacja (9 modułów, 44 testy)
├── src/
│   ├── lib/allegro/             ← integracja z prawdziwym API (gotowa architektura)
│   ├── mocks/                   ← MSW handlers + 10+ fixtures
│   ├── components/              ← ErrorBanner, PermissionTree, PermissionDetails
│   └── routes/permissions.tsx   ← główna strona demo
└── docs/                        ← ta dokumentacja
```
