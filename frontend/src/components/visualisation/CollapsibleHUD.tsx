/**
 * CollapsibleHUD
 * Shared container for all visualisation HUD panels.
 * Provides the gradient background, shadow, border, and a
 * click-to-collapse header row.
 */
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";

interface CollapsibleHUDProps {
    /** Icon shown in the header (e.g. <Target className="text-primary" />) */
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    /** Whether the panel starts expanded. Defaults to true. */
    defaultOpen?: boolean;
    /** Extra className on the outer wrapper (e.g. for width / padding overrides) */
    className?: string;
    /** Extra inline styles on the outer wrapper (used by scale-factor HUDs) */
    style?: React.CSSProperties;
    /** Extra className applied to the content area */
    contentClassName?: string;
}

const CollapsibleHUD: React.FC<CollapsibleHUDProps> = ({
    icon,
    title,
    children,
    defaultOpen = true,
    className = "",
    style,
    contentClassName = "",
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div
            className={`bg-gradient-to-br from-blue-50 to-purple-50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 ${className}`}
            style={style}
        >
            {/* Header — always visible, click to toggle */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 cursor-pointer select-none"
            >
                <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    {icon}
                    {title}
                </span>
                {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
            </button>

            {/* Collapsible content */}
            {open && (
                <div className={`px-5 pb-5 ${contentClassName}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleHUD;
