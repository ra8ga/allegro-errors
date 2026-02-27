/**
 * Normalizer — converts any error format to NormalizedError[].
 *
 * Handles:
 * - string          → single error, code inferred from text
 * - string[]        → each string normalized individually
 * - object[]        → each { code, path, message, severity, meta } mapped
 * - object          → single error object
 * - Record<string, string[]> → validation map (field → messages)
 * - null/undefined  → empty array
 * - unknown         → fallback UNKNOWN error
 */

import type { NormalizedError, ErrorCode, Severity } from './types'
import {
    normalizeCode,
    inferCodeFromString,
    extractPathFromString,
    inferSeverity,
    isRetryable,
} from './codes'

// ─── Single string ────────────────────────────────────

function fromString(str: string): NormalizedError {
    const code = inferCodeFromString(str)
    return {
        code,
        message: str,
        path: extractPathFromString(str),
        severity: inferSeverity(code),
        retryable: isRetryable(code),
    }
}

// ─── Error object { code?, message?, path?, severity?, meta? } ──

function fromObject(err: Record<string, unknown>): NormalizedError {
    const code = normalizeCode(err.code as string)
    const severity = (['info', 'warning', 'error'].includes(err.severity as string)
        ? err.severity as Severity
        : inferSeverity(code))

    return {
        code,
        message: (err.message as string) ?? (err.msg as string) ?? 'Unknown error',
        path: (err.path as string) ?? undefined,
        severity,
        retryable: err.retryable === true || isRetryable(code),
        meta: buildMeta(err),
    }
}

function buildMeta(err: Record<string, unknown>): Record<string, unknown> | undefined {
    // Collect known extra fields into meta
    const skip = new Set(['code', 'message', 'msg', 'path', 'severity', 'retryable'])
    const meta: Record<string, unknown> = {}
    let hasAny = false
    for (const [k, v] of Object.entries(err)) {
        if (!skip.has(k) && v !== undefined) {
            meta[k] = v
            hasAny = true
        }
    }
    // Merge explicit meta if it exists
    if (typeof err.meta === 'object' && err.meta !== null) {
        Object.assign(meta, err.meta)
        hasAny = true
    }
    return hasAny ? meta : undefined
}

// ─── Validation map { field: string[] } ───────────────

function fromValidationMap(map: Record<string, string[]>): NormalizedError[] {
    const errors: NormalizedError[] = []
    for (const [field, messages] of Object.entries(map)) {
        for (const msg of messages) {
            errors.push({
                code: 'VALIDATION',
                message: msg,
                path: field.startsWith('input.') ? field : `input.${field}`,
                severity: 'error',
                retryable: false,
            })
        }
    }
    return errors
}

// ─── Main entry point ─────────────────────────────────

export function normalizeErrors(raw: unknown): NormalizedError[] {
    // null / undefined → no errors
    if (raw == null) return []

    // string → single error
    if (typeof raw === 'string') {
        if (raw.trim() === '') return []
        return [fromString(raw)]
    }

    // Array → string[] or object[]
    if (Array.isArray(raw)) {
        return raw.flatMap((item): NormalizedError[] => {
            if (typeof item === 'string') return [fromString(item)]
            if (typeof item === 'object' && item !== null) return [fromObject(item as Record<string, unknown>)]
            return [{
                code: 'UNKNOWN' as ErrorCode,
                message: String(item),
                severity: 'error' as Severity,
                retryable: false,
            }]
        })
    }

    // Object — could be validation map or single error
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>

        // Validation map: every value is string[]
        const values = Object.values(obj)
        if (values.length > 0 && values.every(v =>
            Array.isArray(v) && (v as unknown[]).every(i => typeof i === 'string')
        )) {
            return fromValidationMap(obj as Record<string, string[]>)
        }

        // Single error object with code/message
        if ('code' in obj || 'message' in obj || 'msg' in obj) {
            return [fromObject(obj)]
        }
    }

    // Fallback
    return [{
        code: 'UNKNOWN',
        message: 'Nieznany format błędu',
        severity: 'error',
        retryable: false,
        meta: { rawValue: raw },
    }]
}
