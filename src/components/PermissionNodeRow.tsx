import { cn } from "@/lib/utils";
import type { PermissionNode, PermissionStatus } from "@/types";
import {
    ShieldCheckIcon,
    CircleXIcon,
    LockIcon,
    AlertTriangleIcon,
    ChevronDownIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

const statusConfig: Record<
    PermissionStatus,
    {
        icon: typeof ShieldCheckIcon;
        badgeLabel: string;
        badgeClass: string;
        iconClass: string;
        dotClass: string;
    }
> = {
    granted: {
        icon: ShieldCheckIcon,
        badgeLabel: "Przyznany",
        badgeClass:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        iconClass: "text-status-granted",
        dotClass: "bg-status-granted",
    },
    denied: {
        icon: CircleXIcon,
        badgeLabel: "Odmowa",
        badgeClass:
            "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
        iconClass: "text-status-denied",
        dotClass: "bg-status-denied",
    },
    locked: {
        icon: LockIcon,
        badgeLabel: "Zablokowany",
        badgeClass:
            "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",
        iconClass: "text-status-locked",
        dotClass: "bg-status-locked",
    },
    partial: {
        icon: AlertTriangleIcon,
        badgeLabel: "Częściowy",
        badgeClass:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        iconClass: "text-status-partial",
        dotClass: "bg-status-partial",
    },
};

interface PermissionNodeRowProps {
    node: PermissionNode;
    depth?: number;
    expandedIds: Set<string>;
    selectedNodeId: string | null;
    onToggleExpand: (id: string) => void;
    onSelect: (id: string) => void;
}

export function PermissionNodeRow({
    node,
    depth = 0,
    expandedIds,
    selectedNodeId,
    onToggleExpand,
    onSelect,
}: PermissionNodeRowProps) {
    const config = statusConfig[node.status];
    const StatusIcon = config.icon;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const isLocked = node.status === "locked";
    const isTopLevel = depth === 0;

    const rowContent = (
        <button
            type="button"
            onClick={() => {
                onSelect(node.id);
                if (hasChildren) {
                    onToggleExpand(node.id);
                }
            }}
            className={cn(
                "group flex w-full items-center gap-3 text-left transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isTopLevel
                    ? "rounded-xl px-4 py-3.5 hover:bg-accent/60"
                    : "rounded-lg px-3 py-2.5 hover:bg-accent/50",
                isSelected && "bg-brand/6 ring-1 ring-brand/15 shadow-sm",
                isLocked && "opacity-45 cursor-not-allowed"
            )}
            style={{ paddingLeft: isTopLevel ? undefined : `${depth * 28 + 12}px` }}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-disabled={isLocked}
        >
            {/* Status icon */}
            <span
                className={cn(
                    "shrink-0 flex items-center justify-center rounded-lg transition-colors",
                    config.iconClass,
                    isTopLevel
                        ? "h-9 w-9 bg-current/8"
                        : "h-7 w-7"
                )}
            >
                <StatusIcon size={isTopLevel ? 20 : 16} />
            </span>

            {/* Label + description */}
            <span className="flex-1 min-w-0">
                <span
                    className={cn(
                        "block leading-tight truncate",
                        isTopLevel
                            ? "text-[15px] font-semibold"
                            : "text-sm font-medium text-foreground/90"
                    )}
                >
                    {node.label}
                </span>
                {node.description && (
                    <span
                        className={cn(
                            "block text-muted-foreground leading-snug mt-0.5 truncate",
                            isTopLevel ? "text-xs" : "text-[11px]"
                        )}
                    >
                        {node.description}
                    </span>
                )}
            </span>

            {/* Badge */}
            <Badge
                variant="outline"
                className={cn(
                    "shrink-0 px-2 py-0.5 rounded-md font-medium pointer-events-none",
                    isTopLevel ? "text-[11px]" : "text-[10px]",
                    config.badgeClass
                )}
            >
                {config.badgeLabel}
            </Badge>

            {/* Chevron */}
            {hasChildren && (
                <ChevronDownIcon
                    size={16}
                    className={cn(
                        "shrink-0 text-muted-foreground/60 transition-transform duration-200",
                        isExpanded && "rotate-180"
                    )}
                />
            )}
        </button>
    );

    const row = isLocked ? (
        <Tooltip>
            <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
                Brak dostępu — ta sekcja jest zablokowana
            </TooltipContent>
        </Tooltip>
    ) : (
        rowContent
    );

    if (!hasChildren) {
        return <div role="treeitem">{row}</div>;
    }

    return (
        <Collapsible
            open={isExpanded}
            onOpenChange={() => onToggleExpand(node.id)}
            role="treeitem"
        >
            <CollapsibleTrigger asChild>{row}</CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                <div
                    className={cn(
                        "relative",
                        isTopLevel && "ml-[26px] border-l-2 border-border/40 pl-0"
                    )}
                >
                    <div role="group" aria-label={`${node.label} children`} className="py-0.5">
                        {node.children!.map((child) => (
                            <PermissionNodeRow
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                expandedIds={expandedIds}
                                selectedNodeId={selectedNodeId}
                                onToggleExpand={onToggleExpand}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
