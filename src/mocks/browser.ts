import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * Start MSW worker and return a promise that resolves when ready.
 * This ensures all subsequent fetches are intercepted.
 */
export async function startMsw(): Promise<void> {
    if (import.meta.env.DEV) {
        await worker.start({ onUnhandledRequest: 'bypass' })
    }
}
