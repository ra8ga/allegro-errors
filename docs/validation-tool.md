# @validation-tool — API Response Validation & Normalization

Standalone pakiet do walidacji i normalizacji odpowiedzi API.  
Zero zależności. Framework-agnostic. 44 testy.

## Problem

Backend może zwrócić błędy w **wielu formatach**:

```json
// Format A: obiekt z errors[]
{ "data": [...], "errors": [{ "code": "NO_ACCESS", "message": "..." }] }

// Format B: errors jako string[]
{ "data": [...], "errors": ["No access to data.phoneNumber"] }

// Format C: validation map
{ "errors": { "email": ["Invalid format"], "phone": ["Required"] } }

// Format D: single string
{ "error": "Unauthorized" }

// Format E: HTML error page
"<html><body>502 Bad Gateway</body></html>"

// Format F: null / undefined / pusty obiekt
null
```

**Validation-tool** obsługuje je **wszystkie** i zwraca zawsze ten sam typ.

## Użycie

```typescript
import { parseApiResponse, s } from '@validation-tool'

// Opcjonalny schema do runtime validation
const UserSchema = s.object({
    name: s.string(),
    email: s.nullable(s.string()),
    age: s.number(),
})

const result = parseApiResponse(response.status, response.body, UserSchema)
// → ApiResult<{ name: string; email: string | null; age: number }>

if (result.kind === 'success') {
    console.log(result.data)      // typesafe ✅
}

if (result.kind === 'partial') {
    console.log(result.data)      // dane dostępne
    console.log(result.errors)    // ale są też błędy
}

if (result.kind === 'failure') {
    console.log(result.errors)    // NormalizedError[]
}
```

## Pipeline

```
unknown response
       │
       ▼
  detectShape()        → 'standard' | 'single-error' | 'string-errors' |
                         'validation-map' | 'plain-text' | 'empty' | 'unknown'
       │
       ▼
  normalizeErrors()    → NormalizedError[]
       │
       ▼
  validateData()       → NormalizedError[] (runtime schema check)
       │
       ▼
  classifyResult()     → 'success' | 'partial' | 'failure'
       │
       ▼
  ApiResult<T>
```

## Core Types

### `NormalizedError`

```typescript
interface NormalizedError {
    code: ErrorCode          // 'NO_ACCESS' | 'VALIDATION' | 'NOT_FOUND' | ...
    message: string          // Czytelny komunikat
    path?: string            // 'data.phoneNumber' | 'data.items[3].price'
    severity: Severity       // 'info' | 'warning' | 'error'
    retryable?: boolean
    meta?: Record<string, unknown>
}
```

### `ApiResult<T>`

```typescript
interface ApiResult<T> {
    kind: 'success' | 'partial' | 'failure'
    data: T | null
    errors: NormalizedError[]
    httpStatus: number
}
```

## Runtime Schema Validation

TypeScript daje typy w compile time — ale **nie chroni przed runtime errors** kiedy backend zwróci coś innego niż oczekujesz.

```typescript
import { s } from '@validation-tool'

// Composable schema builders
const schema = s.object({
    name: s.string(),
    items: s.array(s.object({
        id: s.number(),
        price: s.number(),
    })),
    metadata: s.nullable(s.object({
        source: s.string(),
    })),
})

// Jeśli dane nie pasują → INVALID_RESPONSE errors z dokładnymi ścieżkami
// np. "Expected number at data.items[2].price, got string"
```

## UI Helpers

Framework-agnostic funkcje do budowania UI z `ApiResult`:

```typescript
import {
    getFieldState,      // → { hasError, severity, errors } dla pola
    getFieldErrors,     // → NormalizedError[] dla ścieżki
    getGlobalErrors,    // → błędy bez path (globalne)
    hasRetryableError,  // → boolean
    getRetryAfter,      // → number | null (sekundy)
    requiresAuth,       // → boolean (401)
    isForbidden,        // → boolean (403)
    buildFieldStateMap, // → Map<string, FieldState>
    groupBySeverity,    // → { info, warning, error }
} from '@validation-tool'
```

## Moduły

| Plik | LOC | Rola |
|---|---|---|
| `types.ts` | 73 | Core typy |
| `codes.ts` | 77 | Mapowanie kodów + inferowanie z tekstu |
| `detect.ts` | 56 | Detekcja 7 kształtów response |
| `normalize.ts` | 161 | Normalizacja dowolnego formatu |
| `validate.ts` | 164 | Runtime schema validation |
| `classify.ts` | 25 | success/partial/failure |
| `parse.ts` | 126 | Główny entry point |
| `helpers.ts` | 131 | 13 UI helpers |
| `index.ts` | 47 | Barrel export |

## Testy

```bash
npm run test   # 44 testy

# Pokrycie:
# parse.test.ts  — 28 testów (scenariusze A–G + schema)
# helpers.test.ts — 16 testów (wszystkie UI helpers)
```

### Scenariusze testowe

| Grupa | Co testuje |
|---|---|
| A) Happy path | Pełne dane, brak błędów |
| B) Partial success | Dane + błędy dostępu (locked fields) |
| C) Validation errors | Walidacja pól (obiekty i mapa) |
| D) Auth / permissions | 401, 403 |
| E) Not found / Conflict | 404, 409 |
| F) Rate limit / Transient | 429 z retryAfter, 503 |
| G) Weird shapes | string error, null, HTML, undefined, nieznane kształty |
