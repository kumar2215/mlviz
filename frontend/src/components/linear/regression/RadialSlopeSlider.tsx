/**
 * RadialSlopeSlider — flatter U-shape (smiley) arc dial.
 *
 * Fixes:
 *  - Sweep flag = 0 (CCW) for smiley face drawn from L -> R in SVG.
 *  - Flatter arc: Moved origin cy higher and increased radius r.
 *  - Box sizing: Shifted cy such that the entire U sits comfortably.
 */

import React, { useCallback, useEffect, useRef } from "react";

const ANGLE_MIN = -85;
const ANGLE_MAX = 85;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function slopeToAngle(slope: number, xSpan: number, ySpan: number): number {
    if (!xSpan || !ySpan) return 0;
    return clamp(toDeg(Math.atan((slope * xSpan) / ySpan)), ANGLE_MIN, ANGLE_MAX);
}
export function angleToSlope(deg: number, xSpan: number, ySpan: number): number {
    if (!xSpan) return 0;
    return (Math.tan(toRad(deg)) * ySpan) / xSpan;
}

/** Point on arc: Peak (0°) is at bottom of SVG */
function arcPt(deg: number, cx: number, cy: number, r: number) {
    const a = toRad(deg);
    return { x: cx + r * Math.sin(a), y: cy + r * Math.cos(a) };
}

/** SVG arc path. sweep=0 (CCW) traces the bottom half (smiley) from L to R. */
function arcPath(
    cx: number, cy: number, r: number,
    startDeg: number, endDeg: number,
    sweep: 0 | 1 = 0,
) {
    const s = arcPt(startDeg, cx, cy, r);
    const e = arcPt(endDeg, cx, cy, r);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 ${sweep} ${e.x} ${e.y}`;
}

export interface RadialSlopeSliderProps {
    slope: number;
    onSlopeChange: (slope: number) => void;
    onSlopeChangeEnd?: (slope: number) => void;
    xSpan: number;
    ySpan: number;
    size?: number;
}

const RadialSlopeSlider: React.FC<RadialSlopeSliderProps> = ({
    slope, onSlopeChange, onSlopeChangeEnd, xSpan, ySpan, size = 200,
}) => {
    // Layout constants scaled by size
    const W = size;
    const H = Math.round(size * 0.52);
    const cx = W / 2;
    // Anchor the peak (cy+r) near the bottom of the viewBox
    const cy = Math.round(size * 0.05); 
    const r  = Math.round(size * 0.44); 
    const HR = Math.max(7, size * 0.038);

    const angle = slopeToAngle(slope, xSpan, ySpan);
    const hp    = arcPt(angle, cx, cy, r);
    const color = angle >= 0 ? "#6366f1" : "#f97316";

    // Indicator line sits inside the arc curve (higher than the peak)
    const previewY   = cy + r * 0.6;
    const previewLen = r * 0.38;

    const dragging = useRef(false);
    const svgRef   = useRef<SVGSVGElement>(null);

    const angleFromPointer = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return angle;
        const rect = svg.getBoundingClientRect();
        const dx = (clientX - rect.left) * (W / rect.width)  - cx;
        const dy = (clientY - rect.top)  * (H / rect.height) - cy;
        return clamp(toDeg(Math.atan2(dx, dy)), ANGLE_MIN, ANGLE_MAX);
    }, [W, H, cx, cy, angle]);

    const onMove = useCallback((e: PointerEvent) => {
        if (!dragging.current) return;
        onSlopeChange(angleToSlope(angleFromPointer(e.clientX, e.clientY), xSpan, ySpan));
    }, [angleFromPointer, onSlopeChange, xSpan, ySpan]);

    const onUp = useCallback(() => { 
        if (dragging.current && onSlopeChangeEnd) {
            onSlopeChangeEnd(slope);
        }
        dragging.current = false; 
    }, [onSlopeChangeEnd, slope]);

    useEffect(() => {
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup",   onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup",   onUp);
        };
    }, [onMove, onUp]);

    const ticks = [-60, -30, 0, 30, 60];

    return (
        <svg
            ref={svgRef}
            width={W} height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ touchAction: "none", userSelect: "none", display: "block", overflow: "visible" }}
        >
            {/* Background trough */}
            <path d={arcPath(cx, cy, r, ANGLE_MIN, ANGLE_MAX, 0)}
                fill="none" stroke="#f1f5f9" strokeWidth={12} strokeLinecap="round" />

            {/* Main Track (Smiley needs sweep=0) */}
            <path d={arcPath(cx, cy, r, ANGLE_MIN, ANGLE_MAX, 0)}
                fill="none" stroke="#cbd5e1" strokeWidth={8} strokeLinecap="round" />

            {/* Filled highlight arc (smiles CCW) */}
            {Math.abs(angle) > 0.5 && (
                <path
                    d={angle > 0
                        ? arcPath(cx, cy, r, 0, angle, 0) // 0 to right: CCW
                        : arcPath(cx, cy, r, angle, 0, 0)} // left to 0: CCW
                    fill="none" stroke={color} strokeWidth={8}
                    strokeLinecap="round" opacity={0.9}
                />
            )}

            {/* Ticks */}
            {ticks.map(td => {
                const inn = arcPt(td, cx, cy, r - 5);
                const out = arcPt(td, cx, cy, r + 5);
                return (
                    <line key={td}
                        x1={inn.x} y1={inn.y} x2={out.x} y2={out.y}
                        stroke={td === 0 ? "#94a3b8" : "#cbd5e1"}
                        strokeWidth={td === 0 ? 2 : 1} />
                );
            })}

            {/* Rotating indicator */}
            <line
                x1={cx - previewLen} y1={previewY}
                x2={cx + previewLen} y2={previewY}
                stroke={Math.abs(angle) < 1 ? "#94a3b8" : color}
                strokeWidth={2} strokeLinecap="round" opacity={0.8}
                transform={`rotate(${-angle}, ${cx}, ${previewY})`}
            />

            {/* labels */}
            {(["left", "right"] as const).map(side => {
                const deg = side === "left" ? ANGLE_MIN : ANGLE_MAX;
                const pt  = arcPt(deg, cx, cy, r + 16);
                return (
                    <text key={side}
                        x={pt.x} y={pt.y}
                        textAnchor={side === "left" ? "end" : "start"}
                        fontSize={12} fill="#94a3b8" dominantBaseline="middle" fontWeight="bold">
                        {side === "left" ? "−" : "+"}
                    </text>
                );
            })}

            {/* Handle */}
            <circle cx={hp.x} cy={hp.y} r={HR}
                fill="white" stroke={color} strokeWidth={2.5}
                style={{ cursor: "grab", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
                onPointerDown={e => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    dragging.current = true;
                }}
            />
            <text x={hp.x} y={hp.y + HR * 0.38}
                textAnchor="middle" fontSize={HR * 0.65}
                fontFamily="monospace" fontWeight="bold"
                fill={color} style={{ pointerEvents: "none" }}>
                {angle >= 0 ? "+" : ""}{angle.toFixed(0)}°
            </text>
        </svg>
    );
};

export default RadialSlopeSlider;
