/**
 * Tests for the full parseApiResponse pipeline.
 * Covers all response shapes A–G from the spec.
 */
import { describe, it, expect } from 'vitest'
import { parseApiResponse } from '../parse'
import { s } from '../validate'

// ─── A) Happy path ────────────────────────────────────

describe('A) Happy path', () => {
    it('success-full: all data, no errors', () => {
        const body = { data: { name: 'Andrzej', surname: 'Kowalski', phoneNumber: '+48123456789' } }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('success')
        expect(result.data).toEqual(body.data)
        expect(result.errors).toHaveLength(0)
    })

    it('success with optional null fields', () => {
        const body = { data: { name: 'Andrzej', surname: null, phoneNumber: null } }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('success')
        expect(result.data).toEqual(body.data)
        expect(result.errors).toHaveLength(0)
    })
})

// ─── B) Partial success ──────────────────────────────

describe('B) Partial success', () => {
    it('no access as string errors', () => {
        const body = {
            data: { name: 'Andrzej', surname: null, phoneNumber: null },
            errors: ['No access to data.phoneNumber, missing example user group'],
        }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('partial')
        expect(result.data).toEqual(body.data)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe('NO_ACCESS')
        // Path is extracted via regex from "No access to data.phoneNumber"
        expect(result.errors[0].path).toContain('phoneNumber')
    })

    it('no access as object errors with path and code', () => {
        const body = {
            data: { name: 'Andrzej', phoneNumber: null },
            errors: [
                { code: 'NO_ACCESS', path: 'data.phoneNumber', message: 'Missing group: example' },
            ],
        }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('partial')
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe('NO_ACCESS')
        expect(result.errors[0].path).toBe('data.phoneNumber')
    })

    it('mixed: locked + warning + deprecated', () => {
        const body = {
            data: { name: 'Andrzej', phoneNumber: null, email: 'a@b.com' },
            errors: [
                { code: 'NO_ACCESS', path: 'data.phoneNumber', message: 'No access' },
                { code: 'DEPRECATED_FIELD', path: 'data.email', message: 'Will be removed', severity: 'warning' },
            ],
        }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('partial')
        expect(result.errors).toHaveLength(2)
        expect(result.errors[0].code).toBe('NO_ACCESS')
        expect(result.errors[1].code).toBe('DEPRECATED_FIELD')
        expect(result.errors[1].severity).toBe('warning')
    })

    it('lock on nested object', () => {
        const body = {
            data: { name: 'Andrzej', address: null },
            errors: [{ code: 'NO_ACCESS', path: 'data.address', message: 'No access to address' }],
        }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('partial')
        expect(result.errors[0].path).toBe('data.address')
    })

    it('lock in array item', () => {
        const body = {
            data: { orders: [{ id: '1', price: 10 }, { id: '2', price: null }] },
            errors: [{ code: 'NO_ACCESS', path: 'data.orders[1].price', message: 'No access' }],
        }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('partial')
        expect(result.errors[0].path).toBe('data.orders[1].price')
    })
})

// ─── C) Validation errors ────────────────────────────

describe('C) Validation errors', () => {
    it('field-level validation errors as objects', () => {
        const body = {
            data: null,
            errors: [
                { code: 'VALIDATION', path: 'input.phoneNumber', message: 'Invalid format' },
                { code: 'VALIDATION', path: 'input.surname', message: 'Required' },
            ],
        }
        const result = parseApiResponse(422, body)
        expect(result.kind).toBe('failure')
        expect(result.errors).toHaveLength(2)
        expect(result.errors[0].code).toBe('VALIDATION')
        expect(result.errors[0].path).toBe('input.phoneNumber')
    })

    it('validation as backend map { field: string[] }', () => {
        const body = {
            errors: {
                phoneNumber: ['Invalid format', 'Too short'],
                surname: ['Required'],
            },
        }
        const result = parseApiResponse(422, body)
        expect(result.kind).toBe('failure')
        expect(result.errors).toHaveLength(3)
        expect(result.errors[0].code).toBe('VALIDATION')
        expect(result.errors[0].path).toBe('input.phoneNumber')
        expect(result.errors[0].message).toBe('Invalid format')
    })
})

// ─── D) Auth / permissions ───────────────────────────

describe('D) Auth / permissions', () => {
    it('401 unauthenticated', () => {
        const body = { error: { code: 'UNAUTHENTICATED', message: 'Please log in' } }
        const result = parseApiResponse(401, body)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('UNAUTHENTICATED')
    })

    it('403 forbidden', () => {
        const body = { error: { code: 'FORBIDDEN', message: 'No access to resource' } }
        const result = parseApiResponse(403, body)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('FORBIDDEN')
    })
})

// ─── E) Not found / Conflict ─────────────────────────

describe('E) Not found / Conflict', () => {
    it('404 not found', () => {
        const body = { error: { code: 'NOT_FOUND', message: 'User not found' } }
        const result = parseApiResponse(404, body)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('NOT_FOUND')
    })

    it('409 conflict', () => {
        const body = { error: { code: 'CONFLICT', message: 'Version mismatch', meta: { expected: 3 } } }
        const result = parseApiResponse(409, body)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('CONFLICT')
        // buildMeta collects extra fields + explicit meta
        expect(result.errors[0].meta?.expected).toBe(3)
    })
})

// ─── F) Rate limit / Transient ───────────────────────

describe('F) Rate limit / Transient', () => {
    it('429 rate limit with retryAfter', () => {
        const body = { error: { code: 'RATE_LIMIT', message: 'Too many requests', retryAfter: 10 } }
        const result = parseApiResponse(429, body)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('RATE_LIMIT')
        expect(result.errors[0].retryable).toBe(true)
        expect(result.errors[0].meta?.retryAfter).toBe(10)
    })

    it('503 unavailable', () => {
        const body = { error: { code: 'UNAVAILABLE', message: 'Try later' } }
        const result = parseApiResponse(503, body)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('UNAVAILABLE')
        expect(result.errors[0].retryable).toBe(true)
    })
})

// ─── G) Weird shapes ────────────────────────────────

describe('G) Weird shapes', () => {
    it('errors = string (not array)', () => {
        const body = { data: { name: 'Andrzej' }, errors: 'something went wrong' }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('partial')
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].message).toBe('something went wrong')
    })

    it('errors = null', () => {
        const body = { data: { name: 'Andrzej' }, errors: null }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('success')
        expect(result.errors).toHaveLength(0)
    })

    it('no data field', () => {
        const body = { errors: ['No data returned'] }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('failure')
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it('data is string instead of object', () => {
        const body = { data: 'OK' }
        const result = parseApiResponse(200, body)
        expect(result.errors.some(e => e.code === 'INVALID_RESPONSE')).toBe(true)
    })

    it('completely unknown shape: { payload, issues }', () => {
        const body = { payload: { x: 1 }, issues: [{ msg: '??' }] }
        const result = parseApiResponse(200, body)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('UNKNOWN')
    })

    it('plain text response (HTML error)', () => {
        const result = parseApiResponse(500, 'Internal Server Error')
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('INTERNAL')
        expect(result.errors[0].message).toContain('Internal Server Error')
    })

    it('null body', () => {
        const result = parseApiResponse(200, null)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('UNKNOWN')
    })

    it('undefined body', () => {
        const result = parseApiResponse(200, undefined)
        expect(result.kind).toBe('failure')
        expect(result.errors[0].code).toBe('UNKNOWN')
    })
})

// ─── Schema validation ──────────────────────────────

describe('Schema validation', () => {
    const UserSchema = s.object({
        name: s.string(),
        surname: s.nullable(s.string()),
        phoneNumber: s.nullable(s.string()),
    })

    it('validates correct data against schema', () => {
        const body = { data: { name: 'Andrzej', surname: 'Kowalski', phoneNumber: '+48123' } }
        const result = parseApiResponse(200, body, UserSchema)
        expect(result.kind).toBe('success')
        expect(result.errors).toHaveLength(0)
    })

    it('validates data with nullable fields', () => {
        const body = { data: { name: 'Andrzej', surname: null, phoneNumber: null } }
        const result = parseApiResponse(200, body, UserSchema)
        expect(result.kind).toBe('success')
        expect(result.errors).toHaveLength(0)
    })

    it('catches wrong data type in schema', () => {
        const body = { data: { name: 123, surname: 'OK', phoneNumber: '+48' } }
        const result = parseApiResponse(200, body, UserSchema)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors.some(e => e.code === 'INVALID_RESPONSE')).toBe(true)
    })

    it('validates arrays with schema', () => {
        const OrderSchema = s.object({
            id: s.string(),
            price: s.nullable(s.number()),
        })
        const ListSchema = s.array(OrderSchema)

        const body = { data: [{ id: '1', price: 10 }, { id: '2', price: null }] }
        const result = parseApiResponse(200, body, ListSchema)
        expect(result.kind).toBe('success')
    })

    it('catches schema error in array item', () => {
        const OrderSchema = s.object({
            id: s.string(),
            price: s.number(),
        })
        const ListSchema = s.array(OrderSchema)

        const body = { data: [{ id: '1', price: 10 }, { id: '2', price: 'wrong' }] }
        const result = parseApiResponse(200, body, ListSchema)
        expect(result.errors.some(e => e.code === 'INVALID_RESPONSE')).toBe(true)
    })
})
