/**
 * parseApiResponse — main entry point of the validation-tool.
 *
 * One input:  (httpStatus, unknown body, optional Schema)
 * One output: ApiResult<T>
 *
 * Pipeline: detect → normalize → validate → classify
 */

import type { ApiResult, NormalizedError, Schema } from './types'
import { detectShape } from './detect'
import { normalizeErrors } from './normalize'
import { classifyResult } from './classify'

export function parseApiResponse<T = unknown>(
    httpStatus: number,
    body: unknown,
    schema?: Schema<T>,
): ApiResult<T> {
    const shape = detectShape(body)
    const errors: NormalizedError[] = []
    let data: T | null = null

    // ─── Handle based on shape ────────────────────────

    switch (shape) {
        case 'empty': {
            errors.push({
                code: 'UNKNOWN',
                message: 'Pusta odpowiedź z serwera',
                severity: 'error',
                retryable: false,
            })
            break
        }

        case 'plain-text': {
            errors.push({
                code: 'INTERNAL',
                message: (body as string) || 'Server error',
                severity: 'error',
                retryable: false,
            })
            break
        }

        case 'single-error': {
            const obj = body as Record<string, unknown>
            errors.push(...normalizeErrors(obj.error))
            break
        }

        case 'validation-map': {
            const obj = body as Record<string, unknown>
            errors.push(...normalizeErrors(obj.errors))
            break
        }

        case 'string-errors': {
            const obj = body as Record<string, unknown>
            // Normalize the errors
            if ('errors' in obj) {
                errors.push(...normalizeErrors(obj.errors))
            }
            // Still try to extract data
            if ('data' in obj && obj.data != null && typeof obj.data !== 'string') {
                data = obj.data as T
            }
            break
        }

        case 'standard': {
            const obj = body as Record<string, unknown>

            // Normalize errors if present
            if ('errors' in obj && obj.errors != null) {
                errors.push(...normalizeErrors(obj.errors))
            }
            if ('error' in obj && obj.error != null) {
                errors.push(...normalizeErrors(obj.error))
            }

            // Extract data
            if ('data' in obj) {
                if (obj.data != null && typeof obj.data !== 'string') {
                    data = obj.data as T
                } else if (typeof obj.data === 'string') {
                    errors.push({
                        code: 'INVALID_RESPONSE',
                        message: `Pole "data" ma nieprawidłowy typ: string`,
                        severity: 'error',
                        retryable: false,
                    })
                }
                // data === null is OK — no error, just no data
            }
            break
        }

        case 'unknown':
        default: {
            errors.push({
                code: 'UNKNOWN',
                message: 'Nierozpoznany kształt odpowiedzi API',
                severity: 'error',
                retryable: false,
                meta: typeof body === 'object' ? (body as Record<string, unknown>) : { rawValue: body },
            })
            break
        }
    }

    // ─── Schema validation (runtime type check) ───────

    if (schema && data != null) {
        const validation = schema.validate(data)
        if (!validation.ok) {
            // Data didn't match schema — add errors but keep data for partial display
            for (const err of validation.errors) {
                errors.push({
                    ...err,
                    path: err.path ? `data.${err.path}` : undefined,
                })
            }
        } else {
            data = validation.value
        }
    }

    // ─── Classify ─────────────────────────────────────

    const kind = classifyResult(httpStatus, data, errors)

    return { kind, data, errors, httpStatus }
}
