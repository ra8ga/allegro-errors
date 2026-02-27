/**
 * Shape detector — identifies the format of an API response body.
 *
 * Recognizes:
 * - standard:       { data: ..., errors?: object[] }
 * - single-error:   { error: { code, message } }
 * - string-errors:  { ..., errors: string | string[] }
 * - validation-map: { errors: { field: string[] } }
 * - plain-text:     raw string body
 * - empty:          null | undefined
 * - unknown:        fallback
 */

import type { ResponseShape } from './types'

export function detectShape(body: unknown): ResponseShape {
    if (body == null) return 'empty'
    if (typeof body === 'string') return 'plain-text'
    if (typeof body !== 'object') return 'unknown'

    const obj = body as Record<string, unknown>

    // { error: { code?, message? } } — singular error
    if ('error' in obj && typeof obj.error === 'object' && obj.error !== null) {
        return 'single-error'
    }

    // errors field present
    if ('errors' in obj) {
        const errors = obj.errors

        // errors: string
        if (typeof errors === 'string') return 'string-errors'

        // errors: string[]
        if (Array.isArray(errors)) {
            if (errors.length === 0) {
                return 'data' in obj ? 'standard' : 'unknown'
            }
            if (typeof errors[0] === 'string') return 'string-errors'
            if (typeof errors[0] === 'object') return 'standard'
            return 'unknown'
        }

        // errors: null → treat as standard if data exists
        if (errors === null || errors === undefined) {
            return 'data' in obj ? 'standard' : 'unknown'
        }

        // errors: { field: string[] } — validation map
        if (typeof errors === 'object' && !Array.isArray(errors)) {
            const values = Object.values(errors as Record<string, unknown>)
            if (values.length > 0 && values.every(v =>
                Array.isArray(v) && (v as unknown[]).every(i => typeof i === 'string')
            )) {
                return 'validation-map'
            }
        }
    }

    // { data: ... } without errors
    if ('data' in obj) return 'standard'

    return 'unknown'
}
