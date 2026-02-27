import type { ApiResult } from '@/packages/validation-tool'
import { getGlobalErrors, getFieldLevelErrors, hasRetryableError, getRetryAfter } from '@/packages/validation-tool'
import { cn } from '@/lib/utils'
import { AlertTriangleIcon, CircleXIcon } from '@/components/icons'

interface ErrorBannerProps {
    result: ApiResult
    onRetry?: () => void
}

const kindConfig = {
    failure: {
        icon: CircleXIcon,
        bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50',
        text: 'text-red-800 dark:text-red-300',
        iconColor: 'text-red-500 dark:text-red-400',
    },
    partial: {
        icon: AlertTriangleIcon,
        bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50',
        text: 'text-amber-800 dark:text-amber-300',
        iconColor: 'text-amber-500 dark:text-amber-400',
    },
    success: {
        icon: null,
        bg: '',
        text: '',
        iconColor: '',
    },
}

export function ErrorBanner({ result, onRetry }: ErrorBannerProps) {
    if (result.kind === 'success') return null

    const config = kindConfig[result.kind]
    const Icon = config.icon!
    const globalErrors = getGlobalErrors(result.errors)
    const fieldErrors = getFieldLevelErrors(result.errors)
    const retryable = hasRetryableError(result.errors)
    const retryAfter = getRetryAfter(result.errors)

    return (
        <div className={cn('rounded-xl border px-4 py-3.5 mb-4 animate-in fade-in slide-in-from-top-2 duration-300', config.bg)}>
            <div className="flex items-start gap-3">
                <Icon size={20} className={cn('shrink-0 mt-0.5', config.iconColor)} />
                <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold', config.text)}>
                        {result.kind === 'failure' ? 'Błąd' : 'Częściowy dostęp'}
                        {result.httpStatus > 0 && (
                            <span className="ml-2 text-xs font-mono opacity-60">HTTP {result.httpStatus}</span>
                        )}
                    </p>

                    {/* Global errors */}
                    {globalErrors.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                            {globalErrors.map((err, i) => (
                                <li key={i} className={cn('text-sm', config.text, 'opacity-80')}>
                                    {err.message}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Field-level error summary */}
                    {fieldErrors.length > 0 && (
                        <p className={cn('mt-1.5 text-xs', config.text, 'opacity-60')}>
                            {fieldErrors.length} {fieldErrors.length === 1 ? 'pole' : 'pól'} z ograniczonym dostępem
                        </p>
                    )}

                    {/* Retry */}
                    {retryable && onRetry && (
                        <button
                            onClick={onRetry}
                            className={cn(
                                'mt-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                                'bg-background/80 hover:bg-background border-current/10 hover:border-current/20',
                                config.text,
                            )}
                        >
                            Spróbuj ponownie{retryAfter ? ` (za ${retryAfter}s)` : ''}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Debug Panel ─────────────────────────────────────

interface DebugPanelProps {
    result: ApiResult
    rawResponse: unknown
    scenario: string
}

export function DebugPanel({ result, rawResponse, scenario }: DebugPanelProps) {
    return (
        <details className="mt-4 rounded-xl border border-border/40 bg-muted/20 overflow-hidden group">
            <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:bg-muted/40 transition-colors select-none">
                🔍 Debug Panel — {scenario}
            </summary>
            <div className="border-t border-border/30 p-4 space-y-4 text-xs">
                {/* Result kind */}
                <div>
                    <span className="font-semibold text-muted-foreground block mb-1">Result Kind</span>
                    <span className={cn(
                        'inline-block px-2 py-0.5 rounded-md font-mono font-semibold text-xs',
                        result.kind === 'success' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
                        result.kind === 'partial' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
                        result.kind === 'failure' && 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
                    )}>
                        {result.kind}
                    </span>
                    <span className="ml-2 font-mono text-muted-foreground">HTTP {result.httpStatus}</span>
                </div>

                {/* Normalized Errors */}
                {result.errors.length > 0 && (
                    <div>
                        <span className="font-semibold text-muted-foreground block mb-1">
                            Normalized Errors ({result.errors.length})
                        </span>
                        <div className="space-y-1.5">
                            {result.errors.map((err, i) => (
                                <div key={i} className="font-mono bg-background/60 border border-border/30 rounded-lg px-3 py-2">
                                    <span className="font-semibold text-brand">{err.code}</span>
                                    {err.path && <span className="text-muted-foreground"> @ {err.path}</span>}
                                    <span className="block text-foreground/80 mt-0.5">{err.message}</span>
                                    <span className={cn(
                                        'inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded',
                                        err.severity === 'error' && 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                                        err.severity === 'warning' && 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
                                        err.severity === 'info' && 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
                                    )}>
                                        {err.severity}
                                    </span>
                                    {err.retryable && (
                                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                                            retryable
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Raw Response */}
                <div>
                    <span className="font-semibold text-muted-foreground block mb-1">Raw Response</span>
                    <pre className="bg-background/60 border border-border/30 rounded-lg p-3 overflow-x-auto text-[11px] leading-relaxed text-foreground/80 max-h-64 overflow-y-auto">
                        {JSON.stringify(rawResponse, null, 2)}
                    </pre>
                </div>
            </div>
        </details>
    )
}
