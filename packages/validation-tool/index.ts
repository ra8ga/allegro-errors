/**
 * @allegro/validation-tool
 *
 * Standalone API response validation & normalization toolkit.
 *
 * One input:  unknown (raw API response)
 * One output: ApiResult<T> { kind, data, errors[], httpStatus }
 *
 * Features:
 * - Shape detection (7 response formats)
 * - Error normalization (string, object, map, mixed)
 * - Runtime schema validation (s.object, s.string, etc.)
 * - UI helpers (getFieldState, getGlobalErrors, etc.)
 */

// ─── Types ────────────────────────────────────────────
export type {
    ErrorCode,
    Severity,
    NormalizedError,
    ResultKind,
    ApiResult,
    FieldState,
    ResponseShape,
    Schema,
    ValidationResult,
} from './types'

// ─── Core pipeline ────────────────────────────────────
export { detectShape } from './detect'
export { normalizeErrors } from './normalize'
export { classifyResult } from './classify'
export { parseApiResponse } from './parse'

// ─── Schema builder ──────────────────────────────────
export { s } from './validate'

// ─── Error codes ──────────────────────────────────────
export {
    normalizeCode,
    inferCodeFromString,
    extractPathFromString,
    inferSeverity,
    isRetryable,
} from './codes'

// ─── UI helpers ───────────────────────────────────────
export {
    getFieldState,
    getFieldErrors,
    getErrorsByPrefix,
    getGlobalErrors,
    getFieldLevelErrors,
    hasRetryableError,
    getRetryAfter,
    requiresAuth,
    isForbidden,
    hasDeprecationWarnings,
    buildFieldStateMap,
    getErrorCodes,
    groupBySeverity,
} from './helpers'
