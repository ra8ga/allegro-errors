/**
 * Tests for UI helpers.
 */
import { describe, it, expect } from 'vitest'
import type { NormalizedError, ApiResult } from '../types'
import {
    getFieldState,
    getFieldErrors,
    getErrorsByPrefix,
    getGlobalErrors,
    getFieldLevelErrors,
    hasRetryableError,
    getRetryAfter,
    requiresAuth,
    isForbidden,
    buildFieldStateMap,
    groupBySeverity,
} from '../helpers'

const mockErrors: NormalizedError[] = [
    { code: 'NO_ACCESS', message: 'No access', path: 'data.phone', severity: 'error', retryable: false },
    { code: 'DEPRECATED_FIELD', message: 'Deprecated', path: 'data.email', severity: 'warning', retryable: false },
    { code: 'UNAUTHENTICATED', message: 'Please log in', severity: 'error', retryable: false },
    { code: 'RATE_LIMIT', message: 'Too many', severity: 'error', retryable: true, meta: { retryAfter: 30 } },
    { code: 'NO_ACCESS', message: 'No access to address.city', path: 'data.address.city', severity: 'error', retryable: false },
]

describe('getFieldState', () => {
    it('returns ok for field without errors', () => {
        expect(getFieldState(mockErrors, 'data.name')).toBe('ok')
    })
    it('returns locked for NO_ACCESS', () => {
        expect(getFieldState(mockErrors, 'data.phone')).toBe('locked')
    })
    it('returns warning for DEPRECATED_FIELD', () => {
        expect(getFieldState(mockErrors, 'data.email')).toBe('warning')
    })
})

describe('getFieldErrors', () => {
    it('returns matching field errors', () => {
        expect(getFieldErrors(mockErrors, 'data.phone')).toHaveLength(1)
    })
    it('returns empty for no match', () => {
        expect(getFieldErrors(mockErrors, 'data.name')).toHaveLength(0)
    })
})

describe('getErrorsByPrefix', () => {
    it('returns errors matching prefix', () => {
        expect(getErrorsByPrefix(mockErrors, 'data.address')).toHaveLength(1)
        expect(getErrorsByPrefix(mockErrors, 'data.')).toHaveLength(3)
    })
})

describe('getGlobalErrors', () => {
    it('returns errors without path', () => {
        const global = getGlobalErrors(mockErrors)
        expect(global).toHaveLength(2)
        expect(global.every(e => !e.path)).toBe(true)
    })
})

describe('getFieldLevelErrors', () => {
    it('returns errors with path', () => {
        expect(getFieldLevelErrors(mockErrors)).toHaveLength(3)
    })
})

describe('hasRetryableError', () => {
    it('detects retryable error', () => {
        expect(hasRetryableError(mockErrors)).toBe(true)
    })
    it('returns false when none retryable', () => {
        expect(hasRetryableError([mockErrors[0]])).toBe(false)
    })
})

describe('getRetryAfter', () => {
    it('extracts retryAfter from meta', () => {
        expect(getRetryAfter(mockErrors)).toBe(30)
    })
})

describe('requiresAuth', () => {
    it('detects UNAUTHENTICATED', () => {
        const result: ApiResult = { kind: 'failure', data: null, errors: mockErrors, httpStatus: 401 }
        expect(requiresAuth(result)).toBe(true)
    })
})

describe('isForbidden', () => {
    it('detects global FORBIDDEN', () => {
        const result: ApiResult = {
            kind: 'failure',
            data: null,
            errors: [{ code: 'FORBIDDEN', message: 'No access', severity: 'error', retryable: false }],
            httpStatus: 403,
        }
        expect(isForbidden(result)).toBe(true)
    })
    it('ignores field-level FORBIDDEN', () => {
        const result: ApiResult = {
            kind: 'failure',
            data: null,
            errors: [{ code: 'FORBIDDEN', message: 'No access', path: 'data.x', severity: 'error', retryable: false }],
            httpStatus: 403,
        }
        expect(isForbidden(result)).toBe(false)
    })
})

describe('buildFieldStateMap', () => {
    it('builds map of path → FieldState', () => {
        const map = buildFieldStateMap(mockErrors)
        expect(map.get('data.phone')).toBe('locked')
        expect(map.get('data.email')).toBe('warning')
        expect(map.get('data.address.city')).toBe('locked')
    })
})

describe('groupBySeverity', () => {
    it('groups errors by severity', () => {
        const groups = groupBySeverity(mockErrors)
        expect(groups.error.length).toBe(4)
        expect(groups.warning.length).toBe(1)
    })
})
