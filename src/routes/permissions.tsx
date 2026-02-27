import { useState, useCallback, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { PermissionNode } from "@/types";
import { usePermissionFilter } from "@/hooks/usePermissionFilter";
import { buildPath, getAllNodeIds, findNodeById } from "@/lib/permissions";
import { PermissionTree } from "@/components/PermissionTree";
import { PermissionDetails } from "@/components/PermissionDetails";
import { ErrorBanner, DebugPanel } from "@/components/ErrorBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SearchIcon, XIcon, CircleXIcon } from "@/components/icons";
import { parseApiResponse } from "@validation-tool";
import type { ApiResult } from "@validation-tool";
import { scenarioNames } from "@/mocks/fixtures";
import {
    getConnectionStatus,
    getOAuthLoginUrl,
    disconnectAllegro,
    fetchAllegroPermissions,
} from "@/lib/allegro/server";

// Fixture descriptions for dropdown
import { fixtures } from "@/mocks/fixtures";

export const Route = createFileRoute("/permissions")({
    component: PermissionsPage,
});

type DataSource = 'mock' | 'real'

function PermissionsPage() {
    // Data source toggle
    const [dataSource, setDataSource] = useState<DataSource>('mock');
    const [allegroConnected, setAllegroConnected] = useState(false);
    const [connectingAllegro, setConnectingAllegro] = useState(false);

    // Scenario state (for mock mode)
    const [scenario, setScenario] = useState("partial-string-errors");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ApiResult<PermissionNode[]> | null>(null);
    const [rawResponse, setRawResponse] = useState<unknown>(null);

    // Check Allegro connection status
    useEffect(() => {
        getConnectionStatus().then((status) => {
            setAllegroConnected(status.connected);
        }).catch(() => setAllegroConnected(false));
    }, []);

    // Fetch permissions from MSW (mock mode)
    const fetchMockPermissions = useCallback(async (sc: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/permissions?scenario=${sc}`);
            let body: unknown;
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                body = await res.json();
            } else {
                body = await res.text();
            }
            setRawResponse(body);
            const parsed = parseApiResponse<PermissionNode[]>(res.status, body);
            setResult(parsed);
        } catch (err) {
            setRawResponse(String(err));
            setResult({
                kind: "failure",
                data: null,
                errors: [
                    {
                        code: "INTERNAL",
                        message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
                        severity: "error",
                        retryable: true,
                    },
                ],
                httpStatus: 0,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch permissions from real Allegro API
    const fetchRealPermissions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetchAllegroPermissions();
            setRawResponse(response.body);
            const parsed = parseApiResponse<PermissionNode[]>(response.status, response.body);
            setResult(parsed);
        } catch (err) {
            setRawResponse(String(err));
            setResult({
                kind: "failure",
                data: null,
                errors: [{
                    code: "INTERNAL",
                    message: `Server error: ${err instanceof Error ? err.message : String(err)}`,
                    severity: "error",
                    retryable: true,
                }],
                httpStatus: 0,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount and source/scenario change
    useEffect(() => {
        if (dataSource === 'mock') {
            fetchMockPermissions(scenario);
        } else {
            fetchRealPermissions();
        }
    }, [dataSource, scenario, fetchMockPermissions, fetchRealPermissions]);

    // Allegro OAuth connect
    const handleAllegroConnect = useCallback(async () => {
        setConnectingAllegro(true);
        try {
            const { url } = await getOAuthLoginUrl();
            window.location.href = url;
        } catch {
            setConnectingAllegro(false);
        }
    }, []);

    // Allegro disconnect
    const handleAllegroDisconnect = useCallback(async () => {
        await disconnectAllegro();
        setAllegroConnected(false);
        if (dataSource === 'real') {
            setDataSource('mock');
        }
    }, [dataSource]);

    // Data from API result
    const tree = result?.data ?? [];

    // UI state
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(
        () => new Set()
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [showOnlyProblems, setShowOnlyProblems] = useState(false);

    // Auto-expand top-level on data change
    useEffect(() => {
        if (tree.length > 0) {
            setExpandedIds(new Set(tree.map((n) => n.id)));
            setSelectedNodeId(null);
        }
    }, [result]);

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

                {/* Data Source Toggle */}
                <div className="mb-5 p-4 rounded-xl border border-border/40 bg-card">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Źródło danych
                            </span>
                            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                                <button
                                    onClick={() => setDataSource('mock')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${dataSource === 'mock'
                                        ? 'bg-brand text-white shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    🎭 Mock (MSW)
                                </button>
                                <button
                                    disabled
                                    title="Allegro Sandbox aktualnie nie działa — planuję wrócić do tego w weekend"
                                    className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground/50 cursor-not-allowed"
                                >
                                    🔌 Real API
                                    <span className="ml-1 text-[10px] opacity-60">(soon)</span>
                                </button>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 italic hidden sm:inline">
                                Sandbox Allegro tymczasowo niedostępny — architektura gotowa (src/lib/allegro/)
                            </span>
                        </div>

                        {/* Connection status — hidden while sandbox is down */}
                        {false && dataSource === 'real' && (
                            <div className="flex items-center gap-2 ml-auto">
                                <div className={`w-2 h-2 rounded-full ${allegroConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className="text-xs text-muted-foreground">
                                    {allegroConnected ? 'Połączono z Allegro Sandbox' : 'Brak połączenia'}
                                </span>
                                {allegroConnected ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAllegroDisconnect}
                                        className="text-xs h-7 rounded-md border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        Rozłącz
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAllegroConnect}
                                        disabled={connectingAllegro}
                                        className="text-xs h-7 rounded-md border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                    >
                                        {connectingAllegro ? '⏳ Łączenie...' : '🔗 Połącz z Allegro'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Scenario Switcher (mock mode only) */}
                {dataSource === 'mock' && (
                    <div className="mb-5 p-4 rounded-xl border border-brand/20 bg-brand/5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                                    🎭 Scenariusz
                                </span>
                            </div>
                            <select
                                value={scenario}
                                onChange={(e) => setScenario(e.target.value)}
                                className="flex-1 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                            >
                                {scenarioNames.map((name) => (
                                    <option key={name} value={name}>
                                        {name} — {fixtures[name].description}
                                    </option>
                                ))}
                            </select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchMockPermissions(scenario)}
                                disabled={loading}
                                className="text-xs h-8 gap-1.5 rounded-lg border-brand/20 text-brand hover:bg-brand/10"
                            >
                                {loading ? "⏳" : "🔄"} Odśwież
                            </Button>
                        </div>
                    </div>
                )}

                {/* Real API refresh button */}
                {dataSource === 'real' && (
                    <div className="mb-5 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchRealPermissions}
                            disabled={loading}
                            className="text-xs h-8 gap-1.5 rounded-lg"
                        >
                            {loading ? "⏳" : "🔄"} Odśwież z Allegro API
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Środowisko: {process.env.ALLEGRO_ENV ?? 'sandbox'}
                        </span>
                    </div>
                )}

                {/* Error Banner */}
                {result && (
                    <ErrorBanner
                        result={result}
                        onRetry={() => dataSource === 'mock' ? fetchMockPermissions(scenario) : fetchRealPermissions()}
                    />
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                        <span className="animate-spin">⏳</span>
                        <span className="text-sm">Ładowanie...</span>
                    </div>
                )}

                {/* Main content — only show when we have data */}
                {!loading && result?.data && (
                    <>
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

                        {/* Content grid */}
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

                            {/* Details sidebar */}
                            <aside className="w-80 xl:w-[360px] shrink-0">
                                <Card className="shadow-sm border-border/40 overflow-hidden">
                                    {selectedNode ? (
                                        <PermissionDetails
                                            node={selectedNode}
                                            path={selectedPath}
                                            errors={result?.errors}
                                        />
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
                    </>
                )}

                {/* No data state (failure with no data) */}
                {!loading && result && !result.data && result.kind === 'failure' && (
                    <Card className="shadow-sm border-border/40">
                        <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                                <CircleXIcon size={32} className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold">Nie udało się załadować danych</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Sprawdź debug panel poniżej, aby zobaczyć szczegóły odpowiedzi.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => dataSource === 'mock' ? fetchMockPermissions(scenario) : fetchRealPermissions()}
                                className="text-xs"
                            >
                                🔄 Spróbuj ponownie
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Debug panel */}
                {result && (
                    <DebugPanel
                        result={result}
                        rawResponse={rawResponse}
                        scenario={scenario}
                    />
                )}
            </div>
        </main>
    );
}

