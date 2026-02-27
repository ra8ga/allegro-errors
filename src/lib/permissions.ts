import type { PermissionNode } from "@/types";

/** Build the breadcrumb path from root to the given node ID */
export function buildPath(
    nodes: PermissionNode[],
    targetId: string,
    currentPath: string[] = []
): string[] {
    for (const node of nodes) {
        const path = [...currentPath, node.label];
        if (node.id === targetId) return path;
        if (node.children) {
            const found = buildPath(node.children, targetId, path);
            if (found.length > 0) return found;
        }
    }
    return [];
}

/** Collect all node IDs recursively */
export function getAllNodeIds(nodes: PermissionNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
        ids.push(node.id);
        if (node.children) {
            ids.push(...getAllNodeIds(node.children));
        }
    }
    return ids;
}

/** Find a node by ID in the tree */
export function findNodeById(
    nodes: PermissionNode[],
    id: string
): PermissionNode | undefined {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
    }
    return undefined;
}
