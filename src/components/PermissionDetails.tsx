import type { PermissionNode, PermissionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ShieldCheckIcon,
    CircleXIcon,
    LockIcon,
    AlertTriangleIcon,
    XIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusConfig: Record<
    PermissionStatus,
    {
        icon: typeof ShieldCheckIcon;
        label: string;
        description: string;
        colorClass: string;
        badgeClass: string;
        bgClass: string;
    }
> = {
    granted: {
        icon: ShieldCheckIcon,
        label: "Przyznany",
        description: "Pełny dostęp do tej funkcji",
        colorClass: "text-status-granted",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        bgClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
    },
    denied: {
        icon: CircleXIcon,
        label: "Odmowa",
        description: "Dostęp do tej funkcji jest zabroniony",
        colorClass: "text-status-denied",
        badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
        bgClass: "bg-red-50/50 dark:bg-red-950/20",
    },
    locked: {
        icon: LockIcon,
        label: "Zablokowany",
        description: "Ta sekcja jest niedostępna",
        colorClass: "text-status-locked",
        badgeClass: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",
        bgClass: "bg-zinc-100/50 dark:bg-zinc-800/20",
    },
    partial: {
        icon: AlertTriangleIcon,
        label: "Częściowy",
        description: "Niektóre elementy podrzędne mają ograniczony dostęp",
        colorClass: "text-status-partial",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
    },
};

interface PermissionDetailsProps {
    node: PermissionNode;
    path: string[];
    onClose?: () => void;
}

export function PermissionDetails({
    node,
    path,
    onClose,
}: PermissionDetailsProps) {
    const config = statusConfig[node.status];
    const StatusIcon = config.icon;

    return (
        <div className="flex flex-col gap-0 p-0">
            {/* Close button (mobile) */}
            {onClose && (
                <div className="flex justify-end px-4 pt-3 lg:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                        aria-label="Zamknij szczegóły"
                    >
                        <XIcon size={16} />
                    </Button>
                </div>
            )}

            {/* Header with colored background */}
            <div className={cn("px-5 py-5 rounded-t-xl", config.bgClass)}>
                <div className="flex items-start gap-3.5">
                    <div className={cn(
                        "mt-0.5 shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-background shadow-sm",
                        config.colorClass
                    )}>
                        <StatusIcon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-tight">{node.label}</h3>
                        {node.description && (
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                {node.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Details body */}
            <div className="px-5 py-4 space-y-5">
                {/* Status */}
                <div>
                    <Label>Status</Label>
                    <div className="mt-2 flex items-center gap-2.5">
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-xs font-medium px-2.5 py-1 rounded-md",
                                config.badgeClass
                            )}
                        >
                            {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {config.description}
                        </span>
                    </div>
                </div>

                <Separator className="opacity-50" />

                {/* Path */}
                <div>
                    <Label>Ścieżka</Label>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                        {path.map((segment, i) => (
                            <span key={i} className="flex items-center gap-1">
                                {i > 0 && (
                                    <span className="text-muted-foreground/40 mx-0.5 text-xs">→</span>
                                )}
                                <span
                                    className={cn(
                                        "px-2 py-0.5 rounded-md text-xs font-medium",
                                        i === path.length - 1
                                            ? "bg-brand/10 text-brand border border-brand/15"
                                            : "bg-muted/80 text-muted-foreground"
                                    )}
                                >
                                    {segment}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                <Separator className="opacity-50" />

                {/* ID */}
                <div>
                    <Label>Identyfikator</Label>
                    <p className="mt-2 text-sm font-mono bg-muted/40 border border-border/50 rounded-lg px-3 py-2 inline-block text-muted-foreground select-all">
                        {node.id}
                    </p>
                </div>

                {/* Children count */}
                {node.children && node.children.length > 0 && (
                    <>
                        <Separator className="opacity-50" />
                        <div>
                            <Label>Elementy podrzędne</Label>
                            <p className="mt-2 text-sm tabular-nums">
                                <span className="text-lg font-semibold">{node.children.length}</span>
                                {" "}
                                <span className="text-muted-foreground">
                                    {node.children.length === 1 ? "element" : "elementów"}
                                </span>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* Small helper for consistent field labels */
function Label({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {children}
        </span>
    );
}
