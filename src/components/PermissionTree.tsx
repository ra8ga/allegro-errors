import type { PermissionNode } from "@/types";
import { PermissionNodeRow } from "@/components/PermissionNodeRow";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/icons";

interface PermissionTreeProps {
    nodes: PermissionNode[];
    expandedIds: Set<string>;
    selectedNodeId: string | null;
    onToggleExpand: (id: string) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onSelect: (id: string) => void;
}

export function PermissionTree({
    nodes,
    expandedIds,
    selectedNodeId,
    onToggleExpand,
    onExpandAll,
    onCollapseAll,
    onSelect,
}: PermissionTreeProps) {
    return (
        <div className="flex flex-col gap-1">
            {/* Expand / Collapse controls */}
            <div className="flex items-center justify-between px-1 pb-2 border-b border-border/40 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Sekcje uprawnień
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onExpandAll}
                        className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2.5 rounded-md"
                    >
                        Rozwiń
                    </Button>
                    <span className="text-muted-foreground/30 text-xs">|</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCollapseAll}
                        className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2.5 rounded-md"
                    >
                        Zwiń
                    </Button>
                </div>
            </div>

            {/* Tree */}
            <div role="tree" aria-label="Lista uprawnień" className="flex flex-col gap-0.5">
                {nodes.length > 0 ? (
                    nodes.map((node, i) => (
                        <div key={node.id}>
                            {i > 0 && (
                                <div className="my-1 mx-2 border-t border-border/30" />
                            )}
                            <PermissionNodeRow
                                node={node}
                                expandedIds={expandedIds}
                                selectedNodeId={selectedNodeId}
                                onToggleExpand={onToggleExpand}
                                onSelect={onSelect}
                            />
                        </div>
                    ))
                ) : (
                    <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                        <SearchIcon size={32} className="opacity-30" />
                        <p className="text-sm">Brak wyników dla podanych filtrów</p>
                    </div>
                )}
            </div>
        </div>
    );
}
