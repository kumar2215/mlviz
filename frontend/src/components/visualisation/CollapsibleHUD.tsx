/**
 * CollapsibleHUD
 * Shared container for all visualisation HUD panels.
 * Provides the shared surface, shadow, border, and a
 * click-to-collapse header row.
 */
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";
import { useTour } from "@/store/tourStore";

interface CollapsibleHUDProps {
    tourTarget?: string;
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
    tourTarget,
}) => {
    const [open, setOpen] = useState(defaultOpen);
    const tourOpen = useTour(state => Boolean(tourTarget && state.running && state.tour?.steps[state.step]?.hud === tourTarget));
    const expanded = open || tourOpen;

    return (
        <div
            data-tour={tourTarget}
            className={`bg-surface-tint   backdrop-blur-md rounded-2xl shadow-2xl border border-border ${className}`}
            style={style}
        >
            {/* Header — always visible, click to toggle */}
            <button
                type="button"
                aria-expanded={expanded}
                disabled={tourOpen}
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 cursor-pointer select-none"
            >
                <span className="font-bold text-foreground flex items-center gap-2 text-sm">
                    {icon}
                    {title}
                </span>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-text-secondary shrink-0" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
                )}
            </button>

            {/* Collapsible content */}
            {expanded && (
                <div className={`px-5 pb-5 ${contentClassName}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleHUD;
