/**
 * Runtime schema validation — zero external dependencies.
 *
 * Validates `data` at runtime because TypeScript doesn't protect at runtime.
 * If data doesn't match schema → INVALID_RESPONSE errors.
 *
 * Usage:
 *   const UserSchema = s.object({
 *     name: s.string(),
 *     surname: s.nullable(s.string()),
 *     phoneNumber: s.nullable(s.string()),
 *   })
 *
 *   const result = UserSchema.validate(data)
 *   // { ok: true, value: User } | { ok: false, errors: NormalizedError[] }
 */

import type { NormalizedError, Schema, ValidationResult } from './types'

function makeError(path: string, message: string): NormalizedError {
    return {
        code: 'INVALID_RESPONSE',
        message,
        path,
        severity: 'error',
        retryable: false,
    }
}

// ─── Primitive schemas ────────────────────────────────

function stringSchema(): Schema<string> {
    return {
        validate(data: unknown): ValidationResult<string> {
            if (typeof data === 'string') return { ok: true, value: data }
            return { ok: false, errors: [makeError('', `Expected string, got ${typeof data}`)] }
        },
    }
}

function numberSchema(): Schema<number> {
    return {
        validate(data: unknown): ValidationResult<number> {
            if (typeof data === 'number' && !Number.isNaN(data)) return { ok: true, value: data }
            return { ok: false, errors: [makeError('', `Expected number, got ${typeof data}`)] }
        },
    }
}

function booleanSchema(): Schema<boolean> {
    return {
        validate(data: unknown): ValidationResult<boolean> {
            if (typeof data === 'boolean') return { ok: true, value: data }
            return { ok: false, errors: [makeError('', `Expected boolean, got ${typeof data}`)] }
        },
    }
}

// ─── Combinators ──────────────────────────────────────

function nullableSchema<T>(inner: Schema<T>): Schema<T | null> {
    return {
        validate(data: unknown): ValidationResult<T | null> {
            if (data === null || data === undefined) return { ok: true, value: null }
            return inner.validate(data) as ValidationResult<T | null>
        },
    }
}

function optionalSchema<T>(inner: Schema<T>): Schema<T | undefined> {
    return {
        validate(data: unknown): ValidationResult<T | undefined> {
            if (data === undefined) return { ok: true, value: undefined }
            return inner.validate(data) as ValidationResult<T | undefined>
        },
    }
}

function arraySchema<T>(itemSchema: Schema<T>): Schema<T[]> {
    return {
        validate(data: unknown): ValidationResult<T[]> {
            if (!Array.isArray(data)) {
                return { ok: false, errors: [makeError('', `Expected array, got ${typeof data}`)] }
            }
            const values: T[] = []
            const errors: NormalizedError[] = []

            for (let i = 0; i < data.length; i++) {
                const result = itemSchema.validate(data[i])
                if (result.ok) {
                    values.push(result.value)
                } else {
                    // Prefix paths with array index
                    for (const err of result.errors) {
                        errors.push({
                            ...err,
                            path: err.path ? `[${i}].${err.path}` : `[${i}]`,
                        })
                    }
                }
            }

            if (errors.length > 0) return { ok: false, errors }
            return { ok: true, value: values }
        },
    }
}

type ObjectShape = Record<string, Schema<any>>
type InferObject<S extends ObjectShape> = { [K in keyof S]: S[K] extends Schema<infer T> ? T : never }

function objectSchema<S extends ObjectShape>(shape: S): Schema<InferObject<S>> {
    return {
        validate(data: unknown): ValidationResult<InferObject<S>> {
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                return { ok: false, errors: [makeError('', `Expected object, got ${data === null ? 'null' : typeof data}`)] }
            }

            const obj = data as Record<string, unknown>
            const result: Record<string, unknown> = {}
            const errors: NormalizedError[] = []

            for (const [key, schema] of Object.entries(shape)) {
                const fieldResult = schema.validate(obj[key])
                if (fieldResult.ok) {
                    result[key] = fieldResult.value
                } else {
                    for (const err of fieldResult.errors) {
                        errors.push({
                            ...err,
                            path: err.path ? `${key}.${err.path}` : key,
                        })
                    }
                }
            }

            if (errors.length > 0) return { ok: false, errors }
            return { ok: true, value: result as InferObject<S> }
        },
    }
}

function literalSchema<T extends string | number | boolean>(expected: T): Schema<T> {
    return {
        validate(data: unknown): ValidationResult<T> {
            if (data === expected) return { ok: true, value: expected }
            return { ok: false, errors: [makeError('', `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(data)}`)] }
        },
    }
}

function unionSchema<T>(...schemas: Schema<T>[]): Schema<T> {
    return {
        validate(data: unknown): ValidationResult<T> {
            const allErrors: NormalizedError[] = []
            for (const schema of schemas) {
                const result = schema.validate(data)
                if (result.ok) return result
                allErrors.push(...result.errors)
            }
            return { ok: false, errors: [makeError('', `No matching union variant`)] }
        },
    }
}

function unknownSchema(): Schema<unknown> {
    return {
        validate(data: unknown): ValidationResult<unknown> {
            return { ok: true, value: data }
        },
    }
}

// ─── Public API ───────────────────────────────────────

/** Schema builder — `s.object(...)`, `s.string()`, etc. */
export const s = {
    string: stringSchema,
    number: numberSchema,
    boolean: booleanSchema,
    nullable: nullableSchema,
    optional: optionalSchema,
    array: arraySchema,
    object: objectSchema,
    literal: literalSchema,
    union: unionSchema,
    unknown: unknownSchema,
} as const
