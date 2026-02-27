// ─── Error Codes ──────────────────────────────────────
export type ErrorCode =
    | 'NO_ACCESS'
    | 'VALIDATION'
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'RATE_LIMIT'
    | 'UNAVAILABLE'
    | 'DEPRECATED_FIELD'
    | 'MAINTENANCE'
    | 'INTERNAL'
    | 'INVALID_RESPONSE'
    | 'UNKNOWN'

export type Severity = 'info' | 'warning' | 'error'

// ─── Normalized Error ─────────────────────────────────
export interface NormalizedError {
    code: ErrorCode
    message: string
    path?: string
    severity: Severity
    retryable?: boolean
    meta?: Record<string, unknown>
}

// ─── API Result ────────────────────────────────────────
export type ResultKind = 'success' | 'partial' | 'failure'

export interface ApiResult<T = unknown> {
    kind: ResultKind
    data: T | null
    errors: NormalizedError[]
    httpStatus: number
}

// ─── Field State ───────────────────────────────────────
export type FieldState = 'ok' | 'locked' | 'denied' | 'warning' | 'error'

// ─── Response Shape ────────────────────────────────────
export type ResponseShape =
    | 'standard'        // { data, errors?: object[] }
    | 'single-error'    // { error: { code, message } }
    | 'string-errors'   // { data?, errors: string | string[] }
    | 'validation-map'  // { errors: { field: string[] } }
    | 'plain-text'      // raw string body
    | 'empty'           // null / undefined
    | 'unknown'         // fallback — nothing recognized

// ─── Schema (runtime validation) ──────────────────────
export type ValidationResult<T> =
    | { ok: true; value: T }
    | { ok: false; errors: NormalizedError[] }

export interface Schema<T = unknown> {
    validate(data: unknown): ValidationResult<T>
}
