import { useMemo } from "react";
import type { PermissionNode } from "@/types";

interface FilterOptions {
    searchQuery: string;
    showOnlyProblems: boolean;
}

function matchesSearch(node: PermissionNode, query: string): boolean {
    const q = query.toLowerCase();
    if (node.label.toLowerCase().includes(q)) return true;
    if (node.description?.toLowerCase().includes(q)) return true;
    return false;
}

function isProblem(node: PermissionNode): boolean {
    return node.status === "denied" || node.status === "locked" || node.status === "partial";
}

function filterTree(
    nodes: PermissionNode[],
    predicate: (node: PermissionNode) => boolean
): PermissionNode[] {
    const result: PermissionNode[] = [];

    for (const node of nodes) {
        const childMatches = node.children
            ? filterTree(node.children, predicate)
            : [];

        if (predicate(node) || childMatches.length > 0) {
            result.push({
                ...node,
                children: childMatches.length > 0 ? childMatches : node.children,
            });
        }
    }

    return result;
}

export function usePermissionFilter(
    tree: PermissionNode[],
    { searchQuery, showOnlyProblems }: FilterOptions
) {
    const filteredTree = useMemo(() => {
        let result = tree;

        if (searchQuery.trim()) {
            result = filterTree(result, (n) => matchesSearch(n, searchQuery));
        }

        if (showOnlyProblems) {
            result = filterTree(result, (n) => isProblem(n));
        }

        return result;
    }, [tree, searchQuery, showOnlyProblems]);

    const hasActiveFilters = searchQuery.trim().length > 0 || showOnlyProblems;

    return { filteredTree, hasActiveFilters };
}
