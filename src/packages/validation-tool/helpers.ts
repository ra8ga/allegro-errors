/**
 * UI helpers for working with ApiResult and NormalizedError[].
 *
 * These are framework-agnostic — can be used in React, Vue, vanilla, etc.
 */

import type { NormalizedError, FieldState, ApiResult } from './types'

/** Get the UI state of a specific field based on errors */
export function getFieldState(errors: NormalizedError[], path: string): FieldState {
    const fieldErrors = errors.filter(e => e.path === path)
    if (fieldErrors.length === 0) return 'ok'

    // Priority: locked > denied > error > warning
    if (fieldErrors.some(e => e.code === 'NO_ACCESS')) return 'locked'
    if (fieldErrors.some(e => e.code === 'FORBIDDEN')) return 'denied'
    if (fieldErrors.some(e => e.severity === 'error')) return 'error'
    if (fieldErrors.some(e => e.severity === 'warning')) return 'warning'
    return 'error'
}

/** Get all errors for a specific field path */
export function getFieldErrors(errors: NormalizedError[], path: string): NormalizedError[] {
    return errors.filter(e => e.path === path)
}

/** Get errors that match a path prefix (e.g. "data.address" matches "data.address.city") */
export function getErrorsByPrefix(errors: NormalizedError[], prefix: string): NormalizedError[] {
    return errors.filter(e => e.path?.startsWith(prefix) ?? false)
}

/** Get global errors (those NOT tied to a specific field) */
export function getGlobalErrors(errors: NormalizedError[]): NormalizedError[] {
    return errors.filter(e => !e.path)
}

/** Get only field-level errors (those WITH a path) */
export function getFieldLevelErrors(errors: NormalizedError[]): NormalizedError[] {
    return errors.filter(e => !!e.path)
}

/** Check if any error is retryable */
export function hasRetryableError(errors: NormalizedError[]): boolean {
    return errors.some(e => e.retryable)
}

/** Get the retry-after value (seconds) if present */
export function getRetryAfter(errors: NormalizedError[]): number | undefined {
    for (const err of errors) {
        if (err.meta?.retryAfter != null) return err.meta.retryAfter as number
    }
    return undefined
}

/** Check if result requires authentication redirect */
export function requiresAuth(result: ApiResult): boolean {
    return result.errors.some(e => e.code === 'UNAUTHENTICATED')
}

/** Check if result is a global permission denial */
export function isForbidden(result: ApiResult): boolean {
    return result.errors.some(e => e.code === 'FORBIDDEN' && !e.path)
}

/** Check if result has any deprecation warnings */
export function hasDeprecationWarnings(errors: NormalizedError[]): boolean {
    return errors.some(e => e.code === 'DEPRECATED_FIELD')
}

/** Build a map of path → FieldState for quick UI lookups */
export function buildFieldStateMap(errors: NormalizedError[]): Map<string, FieldState> {
    const map = new Map<string, FieldState>()
    const paths = new Set(errors.filter(e => e.path).map(e => e.path!))
    for (const path of paths) {
        map.set(path, getFieldState(errors, path))
    }
    return map
}

/** Get unique error codes present */
export function getErrorCodes(errors: NormalizedError[]): string[] {
    return [...new Set(errors.map(e => e.code))]
}

/** Group errors by severity */
export function groupBySeverity(errors: NormalizedError[]): Record<string, NormalizedError[]> {
    const groups: Record<string, NormalizedError[]> = { error: [], warning: [], info: [] }
    for (const err of errors) {
        groups[err.severity]?.push(err)
    }
    return groups
}
