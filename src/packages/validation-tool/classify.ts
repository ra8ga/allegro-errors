/**
 * Classifier — determines the ResultKind based on HTTP status, data, and errors.
 */

import type { ResultKind, NormalizedError } from './types'

export function classifyResult(
    httpStatus: number,
    data: unknown | null,
    errors: NormalizedError[],
): ResultKind {
    // HTTP 4xx/5xx → always failure
    if (httpStatus >= 400) return 'failure'

    // No data + errors → failure
    if (data == null && errors.length > 0) return 'failure'

    // Data present + errors → partial success
    if (data != null && errors.length > 0) return 'partial'

    // Data present, no errors → success
    return 'success'
}
