/**
 * All mock fixtures for API response scenarios.
 * Each fixture returns { status, body } to simulate HTTP responses.
 */

import type { PermissionNode } from '@/types'

// ─── Types ────────────────────────────────────────────
export interface ApiError {
    code?: string
    path?: string
    message: string
    severity?: 'info' | 'warning' | 'error'
    retryAfter?: number
    meta?: Record<string, unknown>
}

export interface ApiResponse {
    data?: PermissionNode[] | null | string
    errors?: ApiError[] | string[] | string | null | Record<string, string[]>
    error?: ApiError | { code: string; message: string; retryAfter?: number; meta?: Record<string, unknown> }
}

export interface Fixture {
    status: number
    body: ApiResponse | string
    description: string
}

// ─── Permission Data ──────────────────────────────────
const fullPermissions: PermissionNode[] = [
    {
        id: 'orders',
        label: 'Zamówienia',
        description: 'Zarządzanie zamówieniami i ich statusami',
        status: 'granted',
        children: [
            { id: 'orders.view', label: 'Podgląd zamówień', description: 'Przegląd listy zamówień', status: 'granted' },
            { id: 'orders.edit', label: 'Edycja zamówień', description: 'Modyfikacja danych zamówienia', status: 'granted' },
            {
                id: 'orders.returns', label: 'Zwroty', description: 'Obsługa zwrotów', status: 'granted',
                children: [
                    { id: 'orders.returns.approve', label: 'Zatwierdzanie zwrotów', description: 'Akceptacja wniosków', status: 'granted' },
                    { id: 'orders.returns.view', label: 'Podgląd zwrotów', description: 'Historia zwrotów', status: 'granted' },
                ],
            },
            { id: 'orders.shipping', label: 'Wysyłka', description: 'Zarządzanie przesyłkami', status: 'granted' },
        ],
    },
    {
        id: 'payments',
        label: 'Płatności',
        description: 'Transakcje finansowe i rozliczenia',
        status: 'granted',
        children: [
            { id: 'payments.view', label: 'Podgląd transakcji', description: 'Historia płatności', status: 'granted' },
            { id: 'payments.process', label: 'Przetwarzanie płatności', description: 'Inicjowanie transakcji', status: 'granted' },
            {
                id: 'payments.invoices', label: 'Faktury', description: 'Zarządzanie fakturami', status: 'granted',
                children: [
                    { id: 'payments.invoices.create', label: 'Tworzenie faktur', description: 'Generowanie faktur', status: 'granted' },
                    { id: 'payments.invoices.download', label: 'Pobieranie faktur', description: 'Eksport PDF', status: 'granted' },
                ],
            },
            { id: 'payments.settlements', label: 'Rozliczenia', description: 'Wpłaty i wypłaty', status: 'granted' },
        ],
    },
    {
        id: 'user',
        label: 'Dane użytkownika',
        description: 'Dane osobowe i ustawienia konta',
        status: 'granted',
        children: [
            { id: 'user.profile', label: 'Profil', description: 'Dane profilowe', status: 'granted' },
            { id: 'user.addresses', label: 'Adresy', description: 'Adresy wysyłki', status: 'granted' },
            {
                id: 'user.security', label: 'Bezpieczeństwo', description: 'Hasła, 2FA, klucze API', status: 'granted',
                children: [
                    { id: 'user.security.2fa', label: 'Uwierzytelnianie 2FA', description: 'Konfiguracja 2FA', status: 'granted' },
                    { id: 'user.security.api-keys', label: 'Klucze API', description: 'Zarządzanie kluczami', status: 'granted' },
                ],
            },
            { id: 'user.gdpr', label: 'RODO / Prywatność', description: 'Eksport i usuwanie danych', status: 'granted' },
        ],
    },
]

/** Deep clone and apply status overrides by node id */
function withOverrides(overrides: Record<string, Partial<PermissionNode>>): PermissionNode[] {
    function apply(nodes: PermissionNode[]): PermissionNode[] {
        return nodes.map((n) => {
            const override = overrides[n.id]
            const node: PermissionNode = { ...n, ...override }
            if (n.children) {
                node.children = apply(n.children)
            }
            return node
        })
    }
    return apply(fullPermissions)
}

// ─── Fixtures ─────────────────────────────────────────

export const fixtures: Record<string, Fixture> = {
    // ── A) Happy path ──
    'success-full': {
        status: 200,
        description: '✅ Wszystkie uprawnienia przyznane, brak błędów',
        body: { data: fullPermissions },
    },

    'success-optional-null': {
        status: 200,
        description: '✅ Pola opcjonalne mają null (ale brak errors)',
        body: {
            data: withOverrides({
                'orders.edit': { description: undefined },
                'user.gdpr': { description: undefined },
            }),
        },
    },

    // ── B) Partial success (kłódki / airbag) ──
    'partial-string-errors': {
        status: 200,
        description: '🔒 Częściowy dostęp — errors jako string[] (format rekrutera)',
        body: {
            data: withOverrides({
                'orders': { status: 'partial' },
                'orders.edit': { status: 'denied' },
                'orders.returns': { status: 'partial' },
                'orders.returns.approve': { status: 'denied' },
                'payments': { status: 'partial' },
                'payments.process': { status: 'locked' },
                'payments.invoices': { status: 'partial' },
                'payments.invoices.create': { status: 'denied' },
            }),
            errors: [
                'No access to orders.edit, missing permission group: order_editors',
                'No access to orders.returns.approve, missing permission group: return_managers',
                'No access to payments.process, account locked for processing',
                'No access to payments.invoices.create, missing permission group: invoice_creators',
            ],
        },
    },

    'partial-object-errors': {
        status: 200,
        description: '🔒 Częściowy dostęp — errors jako obiekty z path i code',
        body: {
            data: withOverrides({
                'orders': { status: 'partial' },
                'orders.edit': { status: 'denied' },
                'payments': { status: 'partial' },
                'payments.process': { status: 'locked' },
                'user': { status: 'partial' },
                'user.security': { status: 'partial' },
                'user.security.api-keys': { status: 'denied' },
                'user.gdpr': { status: 'locked' },
            }),
            errors: [
                { code: 'NO_ACCESS', path: 'orders.edit', message: 'Brak uprawnień do edycji zamówień' },
                { code: 'NO_ACCESS', path: 'payments.process', message: 'Konto zablokowane do przetwarzania' },
                { code: 'NO_ACCESS', path: 'user.security.api-keys', message: 'Brak dostępu do kluczy API' },
                { code: 'NO_ACCESS', path: 'user.gdpr', message: 'Funkcja RODO wymaga roli administratora' },
            ],
        },
    },

    'partial-mixed-warnings': {
        status: 200,
        description: '⚠️ Mix: locked fields + warnings + deprecated fields',
        body: {
            data: withOverrides({
                'orders': { status: 'partial' },
                'orders.edit': { status: 'locked' },
                'payments': { status: 'partial' },
                'payments.process': { status: 'locked' },
                'user': { status: 'partial' },
                'user.gdpr': { status: 'locked' },
            }),
            errors: [
                { code: 'NO_ACCESS', path: 'orders.edit', message: 'Brak uprawnień', severity: 'error' },
                { code: 'DEPRECATED_FIELD', path: 'payments.settlements', message: 'To pole zostanie usunięte w v3 API', severity: 'warning' },
                { code: 'NO_ACCESS', path: 'payments.process', message: 'Wymagana weryfikacja konta', severity: 'error' },
                { code: 'MAINTENANCE', path: 'user.gdpr', message: 'Moduł RODO tymczasowo niedostępny', severity: 'info' },
            ],
        },
    },

    'partial-nested-lock': {
        status: 200,
        description: '🔒 Lock na całym zagnieżdżonym obiekcie (cały branch locked)',
        body: {
            data: withOverrides({
                'user': { status: 'partial' },
                'user.security': { status: 'locked' },
                'user.security.2fa': { status: 'locked' },
                'user.security.api-keys': { status: 'locked' },
            }),
            errors: [
                { code: 'NO_ACCESS', path: 'user.security', message: 'Cała sekcja bezpieczeństwa wymaga roli security_admin' },
            ],
        },
    },

    // ── C) Validation errors ──
    'validation-field-level': {
        status: 422,
        description: '❌ Błędy walidacji per-field (obiekty)',
        body: {
            data: null,
            errors: [
                { code: 'VALIDATION', path: 'input.phoneNumber', message: 'Nieprawidłowy format numeru telefonu' },
                { code: 'VALIDATION', path: 'input.surname', message: 'Pole wymagane' },
                { code: 'VALIDATION', path: 'input.email', message: 'Adres e-mail jest niepoprawny' },
            ],
        },
    },

    'validation-map-format': {
        status: 422,
        description: '❌ Błędy walidacji jako mapa { field: string[] }',
        body: {
            errors: {
                phoneNumber: ['Nieprawidłowy format', 'Za krótki numer'],
                surname: ['Pole wymagane'],
                email: ['Niepoprawny adres e-mail'],
            },
        },
    },

    // ── D) Auth / Permissions (global) ──
    'auth-401': {
        status: 401,
        description: '🚫 Brak autoryzacji — 401 Unauthenticated',
        body: {
            error: { code: 'UNAUTHENTICATED', message: 'Sesja wygasła. Zaloguj się ponownie.' },
        },
    },

    'auth-403': {
        status: 403,
        description: '🚫 Brak dostępu — 403 Forbidden',
        body: {
            error: { code: 'FORBIDDEN', message: 'Nie masz uprawnień do tego zasobu.' },
        },
    },

    // ── E) Not found / Conflict ──
    'not-found-404': {
        status: 404,
        description: '🔍 Zasób nie znaleziony — 404',
        body: {
            error: { code: 'NOT_FOUND', message: 'Nie znaleziono żądanego zasobu.' },
        },
    },

    'conflict-409': {
        status: 409,
        description: '💥 Konflikt wersji — 409',
        body: {
            error: { code: 'CONFLICT', message: 'Konflikt wersji danych. Odśwież stronę.', meta: { expected: 3, actual: 5 } },
        },
    },

    // ── F) Rate limit / Transient ──
    'rate-limit-429': {
        status: 429,
        description: '⏳ Zbyt wiele zapytań — 429',
        body: {
            error: { code: 'RATE_LIMIT', message: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.', retryAfter: 10 },
        },
    },

    'unavailable-503': {
        status: 503,
        description: '🔧 Serwer niedostępny — 503',
        body: {
            error: { code: 'UNAVAILABLE', message: 'Serwis chwilowo niedostępny. Trwa przerwa techniczna.' },
        },
    },

    // ── G) Weird / Malformed shapes ──
    'weird-string-errors': {
        status: 200,
        description: '🤡 errors to string (nie tablica)',
        body: {
            data: withOverrides({ 'orders': { status: 'partial' } }),
            errors: 'something went wrong' as any,
        },
    },

    'weird-null-errors': {
        status: 200,
        description: '🤡 errors = null',
        body: {
            data: withOverrides({}),
            errors: null,
        },
    },

    'weird-no-data': {
        status: 200,
        description: '🤡 Brak pola data',
        body: {
            errors: ['No data returned from upstream service'],
        },
    },

    'weird-data-string': {
        status: 200,
        description: '🤡 data to string zamiast obiektu',
        body: {
            data: 'OK' as any,
        },
    },

    'weird-unknown-shape': {
        status: 200,
        description: '🤡 Zupełnie nieznany kształt odpowiedzi',
        body: {
            payload: { x: 1 },
            issues: [{ msg: 'unknown issue format' }],
        } as any,
    },

    'server-error-500': {
        status: 500,
        description: '💀 Internal Server Error — nieparsowalne',
        body: 'Internal Server Error',
    },
}

/** Sorted list of scenario names for the UI dropdown */
export const scenarioNames = Object.keys(fixtures)
