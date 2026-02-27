export type PermissionStatus = "granted" | "denied" | "locked" | "partial";

export interface PermissionNode {
    id: string;
    label: string;
    description?: string;
    status: PermissionStatus;
    children?: PermissionNode[];
}
