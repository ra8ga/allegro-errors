import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaultProps = (size = 20): IconProps => ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
});

export function ShieldCheckIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

export function CircleXIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    );
}

export function LockIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function AlertTriangleIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function ChevronDownIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

export function SunIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </svg>
    );
}

export function MoonIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
    );
}

export function SearchIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    );
}

export function FilterIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    );
}

export function XIcon({ size = 20, className, ...props }: IconProps) {
    return (
        <svg {...defaultProps(size)} className={className} {...props}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
