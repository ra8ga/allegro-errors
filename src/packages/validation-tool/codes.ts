/**
 * Error code utilities: mapping, inference from strings, severity & retryability.
 */

import type { ErrorCode, Severity } from './types'

// ─── Known code map ───────────────────────────────────
const CODE_MAP: Record<string, ErrorCode> = {
    NO_ACCESS: 'NO_ACCESS',
    VALIDATION: 'VALIDATION',
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT: 'RATE_LIMIT',
    UNAVAILABLE: 'UNAVAILABLE',
    DEPRECATED_FIELD: 'DEPRECATED_FIELD',
    MAINTENANCE: 'MAINTENANCE',
    INTERNAL: 'INTERNAL',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
}

/** Normalize a raw code string (case-insensitive) to a known ErrorCode */
export function normalizeCode(raw: string | undefined | null): ErrorCode {
    if (!raw) return 'UNKNOWN'
    return CODE_MAP[raw.toUpperCase()] ?? 'UNKNOWN'
}

// ─── Inference from free-text ─────────────────────────
const PATTERNS: Array<[RegExp, ErrorCode]> = [
    [/no access|missing permission|missing group|account locked/i, 'NO_ACCESS'],
    [/validat|invalid|required|format/i, 'VALIDATION'],
    [/unauth|log ?in|session|expired/i, 'UNAUTHENTICATED'],
    [/forbidden|no permission/i, 'FORBIDDEN'],
    [/not found/i, 'NOT_FOUND'],
    [/conflict|version mismatch/i, 'CONFLICT'],
    [/rate.?limit|too many/i, 'RATE_LIMIT'],
    [/unavailable|try.?later|maintenance/i, 'UNAVAILABLE'],
    [/deprecated|will be removed/i, 'DEPRECATED_FIELD'],
]

/** Infer an ErrorCode from a free-text error message */
export function inferCodeFromString(str: string): ErrorCode {
    for (const [re, code] of PATTERNS) {
        if (re.test(str)) return code
    }
    return 'UNKNOWN'
}

/** Try to extract a field path from a string like "No access to data.phone..." */
export function extractPathFromString(str: string): string | undefined {
    // Try "access to data.phoneNumber" pattern
    const m1 = str.match(/access to\s+([\w.[\]]+)/i)
    if (m1) return m1[1]
    // Try "path: data.phoneNumber" pattern
    const m2 = str.match(/path:?\s*([\w.[\]]+)/i)
    if (m2) return m2[1]
    return undefined
}

// ─── Severity & retryability ──────────────────────────

export function inferSeverity(code: ErrorCode): Severity {
    switch (code) {
        case 'MAINTENANCE':
        case 'DEPRECATED_FIELD':
            return 'warning'
        case 'UNKNOWN':
            return 'error'
        default:
            return 'error'
    }
}

export function isRetryable(code: ErrorCode): boolean {
    return code === 'RATE_LIMIT' || code === 'UNAVAILABLE'
}
