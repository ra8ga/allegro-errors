import { useState, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { PermissionNode } from "@/types";
import permissionsData from "@/data/permissions.json";
import { usePermissionFilter } from "@/hooks/usePermissionFilter";
import { buildPath, getAllNodeIds, findNodeById } from "@/lib/permissions";
import { PermissionTree } from "@/components/PermissionTree";
import { PermissionDetails } from "@/components/PermissionDetails";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { SearchIcon, XIcon } from "@/components/icons";

export const Route = createFileRoute("/permissions")({
    component: PermissionsPage,
});

function PermissionsPage() {
    const tree = permissionsData as PermissionNode[];

    // UI state
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(
        () => new Set(tree.map((n) => n.id))
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [showOnlyProblems, setShowOnlyProblems] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);

    // Filtering
    const { filteredTree, hasActiveFilters } = usePermissionFilter(tree, {
        searchQuery,
        showOnlyProblems,
    });

    // Selected node info
    const selectedNode = useMemo(
        () => (selectedNodeId ? findNodeById(tree, selectedNodeId) : undefined),
        [tree, selectedNodeId]
    );
    const selectedPath = useMemo(
        () => (selectedNodeId ? buildPath(tree, selectedNodeId) : []),
        [tree, selectedNodeId]
    );

    // Handlers
    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleExpandAll = useCallback(() => {
        setExpandedIds(new Set(getAllNodeIds(tree)));
    }, [tree]);

    const handleCollapseAll = useCallback(() => {
        setExpandedIds(new Set());
    }, []);

    const handleSelect = useCallback((id: string) => {
        setSelectedNodeId(id);
        setSheetOpen(true);
    }, []);

    const handleResetFilters = useCallback(() => {
        setSearchQuery("");
        setShowOnlyProblems(false);
    }, []);

    return (
        <main className="min-h-[calc(100vh-64px)] bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Page heading */}
                <div className="mb-5">
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Uprawnienia</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Przejrzyj i zarządzaj uprawnieniami dostępu do funkcji systemu.
                    </p>
                </div>

                {/* Toolbar */}
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <SearchIcon
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                        />
                        <Input
                            type="search"
                            placeholder="Szukaj uprawnień…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-card border-border/60 shadow-sm focus-visible:ring-brand/30"
                            aria-label="Szukaj uprawnień"
                        />
                    </div>

                    {/* Problem filter + reset */}
                    <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer select-none group">
                            <Switch
                                checked={showOnlyProblems}
                                onCheckedChange={setShowOnlyProblems}
                                aria-label="Pokaż tylko problemy"
                            />
                            <span className="hidden sm:inline group-hover:text-foreground transition-colors">
                                Pokaż tylko problemy
                            </span>
                            <span className="sm:hidden">Problemy</span>
                        </label>

                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetFilters}
                                className="text-xs h-8 gap-1.5 rounded-lg border-border/60 shadow-sm"
                            >
                                <XIcon size={12} />
                                Wyczyść
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Tree card */}
                    <Card className="flex-1 shadow-sm border-border/40 overflow-hidden">
                        <CardContent className="p-4 sm:p-5">
                            <PermissionTree
                                nodes={filteredTree}
                                expandedIds={expandedIds}
                                selectedNodeId={selectedNodeId}
                                onToggleExpand={handleToggleExpand}
                                onExpandAll={handleExpandAll}
                                onCollapseAll={handleCollapseAll}
                                onSelect={handleSelect}
                            />
                        </CardContent>
                    </Card>

                    {/* Desktop: Details sidebar */}
                    <aside className="hidden lg:block w-80 xl:w-[360px] shrink-0">
                        <Card className="sticky top-[calc(64px+1.5rem)] shadow-sm border-border/40 overflow-hidden">
                            {selectedNode ? (
                                <PermissionDetails node={selectedNode} path={selectedPath} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-72 text-muted-foreground p-6 text-center gap-3">
                                    <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                                        <SearchIcon size={20} className="opacity-40" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Wybierz uprawnienie</p>
                                        <p className="text-xs mt-0.5 text-muted-foreground/70">
                                            Kliknij element z listy, aby zobaczyć szczegóły
                                        </p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </aside>
                </div>
            </div>

            {/* Mobile: Details Sheet */}
            <Sheet
                open={sheetOpen && !!selectedNode}
                onOpenChange={setSheetOpen}
            >
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Szczegóły uprawnienia</SheetTitle>
                    </SheetHeader>
                    {selectedNode && (
                        <PermissionDetails
                            node={selectedNode}
                            path={selectedPath}
                            onClose={() => setSheetOpen(false)}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </main>
    );
}
