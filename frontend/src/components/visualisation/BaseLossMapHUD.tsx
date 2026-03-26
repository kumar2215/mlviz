import CollapsibleHUD from "@/components/visualisation/CollapsibleHUD";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import * as d3 from "d3";
import { Map } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

const N_CONTOURS = 10;

export type LossMapMode = "heatmap" | "contour" | "both";

interface LossGrid {
    xValues: number[];
    yValues: number[];
    flat: number[];
    values: number[][];
    minLoss: number;
    maxLoss: number;
}

export interface BaseLossMapHUDProps {
    xRange: [number, number];
    yRange: [number, number];
    xLabel: string;
    yLabel: string;
    currentX: number;
    currentY: number;
    proposedX?: number;
    proposedY?: number;
    computeLoss: (x: number, y: number) => number;
    mode?: LossMapMode;
    gridSize?: number;
}

const MODE_LABELS: Record<LossMapMode, string> = {
    heatmap: "Heatmap",
    contour: "Contour",
    both: "Both",
};
const ALL_MODES: LossMapMode[] = ["heatmap", "contour", "both"];

const BaseLossMapHUD: React.FC<BaseLossMapHUDProps> = ({
    xRange,
    yRange,
    xLabel,
    yLabel,
    currentX,
    currentY,
    proposedX,
    proposedY,
    computeLoss,
    mode: modeProp = "both",
    gridSize = 40,
}) => {
    const scaleFactor = useScaleFactor();
    const [mode, setMode] = useState<LossMapMode>(modeProp);

    const fs = (n: number) => `${n * scaleFactor}px`;
    const svgSize = Math.round(220 * scaleFactor);
    const margin = { top: 20, right: 14, bottom: 36, left: 40 };
    const innerW = svgSize - margin.left - margin.right;
    const innerH = svgSize - margin.top - margin.bottom;

    // ---- Compute grid once when parameters change ----
    const lossGrid = useMemo<LossGrid | null>(() => {
        if (!xRange || !yRange) return null;

        const xValues = d3.range(gridSize).map(
            (i) => xRange[0] + (i / (gridSize - 1)) * (xRange[1] - xRange[0])
        );
        const yValues = d3.range(gridSize).map(
            (i) => yRange[0] + (i / (gridSize - 1)) * (yRange[1] - yRange[0])
        );

        const values: number[][] = xValues.map((xVal) =>
            yValues.map((yVal) => computeLoss(xVal, yVal))
        );
        
        const flat = new Array(gridSize * gridSize);
        for (let xi = 0; xi < gridSize; xi++) {
            for (let yi = 0; yi < gridSize; yi++) {
                flat[xi + yi * gridSize] = values[xi][yi];
            }
        }

        const validFlat = flat.filter(v => isFinite(v));
        if (validFlat.length === 0) return null;

        const minLoss = Math.min(...validFlat);
        const maxLoss = Math.max(...validFlat);

        return { xValues, yValues, flat, values, minLoss, maxLoss };
    }, [xRange, yRange, gridSize, computeLoss]);

    const svgRef = useRef<SVGSVGElement>(null);

    // ---- Draw full landscape (grid or mode changes) ----
    useEffect(() => {
        if (!svgRef.current || !lossGrid) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Arrow defs for proposed step marker
        const defs = svg.append("defs");
        defs.append("marker")
            .attr("id", "arrow-proposed")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 9)
            .attr("refY", 5)
            .attr("markerWidth", 5)
            .attr("markerHeight", 5)
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .attr("fill", "#f97316");

        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const { xValues, yValues, flat, minLoss, maxLoss } = lossGrid;

        const xScale = d3
            .scaleLinear()
            .domain([xValues[0], xValues[xValues.length - 1]])
            .range([0, innerW]);

        const yScale = d3
            .scaleLinear()
            .domain([yValues[0], yValues[yValues.length - 1]])
            .range([innerH, 0]);

        const logMin = Math.log1p(Math.max(0, minLoss));
        const logMax = Math.log1p(Math.max(0, maxLoss));

        const colorScale = d3
            .scaleSequential(d3.interpolateYlOrRd)
            .domain([logMin, logMax]);

        // ---- Heatmap cells ----
        if (mode === "heatmap" || mode === "both") {
            const cellW = innerW / gridSize;
            const cellH = innerH / gridSize;
            const rects: { x: number; y: number; loss: number }[] = [];
            xValues.forEach((x, xi) => {
                yValues.forEach((y, yi) => {
                    if (isFinite(lossGrid.values[xi][yi])) {
                        rects.push({ x, y, loss: lossGrid.values[xi][yi] });
                    }
                });
            });

            g.append("g")
                .attr("class", "heatmap-cells")
                .selectAll("rect")
                .data(rects)
                .join("rect")
                .attr("x", (d) => xScale(d.x) - cellW / 2)
                .attr("y", (d) => yScale(d.y) - cellH / 2)
                .attr("width", cellW + 1)
                .attr("height", cellH + 1)
                .attr("fill", (d) => colorScale(Math.log1p(Math.max(0, d.loss))))
                .attr("opacity", mode === "both" ? 0.45 : 1);
        }

        // ---- Contour lines ----
        if (mode === "contour" || mode === "both") {
            // Thresholds evenly spaced in log space for better visual spread
            const thresholds = d3.range(N_CONTOURS + 1).map(
                (i) => Math.expm1(logMin + (i / N_CONTOURS) * (logMax - logMin))
            );

            // Need to clean un-finite values for contour tracer
            const safeFlat = flat.map(v => isFinite(v) ? v : maxLoss * 10);

            const contourGen = d3
                .contours()
                .size([gridSize, gridSize])
                .thresholds(thresholds);

            const contourData = contourGen(safeFlat);

            // d3.contours emits coordinates in grid-index space [0, gridSize).
            // Map directly to pixel space.
            const projection = d3.geoTransform({
                point(px, py) {
                    this.stream.point(
                        (px / (gridSize - 1)) * innerW,
                        innerH - (py / (gridSize - 1)) * innerH,
                    );
                },
            });
            const pathGen = d3.geoPath(projection);

            const contourGroup = g.append("g").attr("class", "contour-lines");

            contourGroup
                .selectAll("path")
                .data(contourData)
                .join("path")
                .attr("d", pathGen)
                .attr("fill", mode === "contour"
                    ? (d) => colorScale(Math.log1p(Math.max(0, d.value)))
                    : "none")
                .attr("fill-opacity", mode === "contour" ? 0.15 : 0)
                .attr("stroke", (d) => colorScale(Math.log1p(Math.max(0, d.value))))
                .attr("stroke-width", 1)
                .attr("stroke-opacity", 0.8);
        }

        // ---- Axes ----
        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(
                d3.axisBottom(xScale).ticks(4)
                    .tickFormat((v) => (v as number).toFixed(1))
            )
            .call((ax) => {
                ax.selectAll("text").style("font-size", "9px").style("fill", "#94a3b8");
                ax.selectAll("line, path").style("stroke", "#e2e8f0");
            });

        g.append("g")
            .call(
                d3.axisLeft(yScale).ticks(4)
                    .tickFormat((v) => (v as number).toFixed(0))
            )
            .call((ax) => {
                ax.selectAll("text").style("font-size", "9px").style("fill", "#94a3b8");
                ax.selectAll("line, path").style("stroke", "#e2e8f0");
            });

        g.append("text")
            .attr("x", innerW / 2)
            .attr("y", innerH + 30)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", "#94a3b8")
            .text(xLabel);

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerH / 2)
            .attr("y", -32)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", "#94a3b8")
            .text(yLabel);

        // ---- Marker layer (updated by separate effect) ----
        g.append("g").attr("class", "marker-layer");

        (svgRef.current as any).__xScale__ = xScale;
        (svgRef.current as any).__yScale__ = yScale;
    }, [lossGrid, mode, innerW, innerH, margin.left, margin.top, xLabel, yLabel, gridSize]);

    // ---- Update markers only ----
    useEffect(() => {
        if (!svgRef.current || !lossGrid) return;

        const xScale: d3.ScaleLinear<number, number> = (svgRef.current as any).__xScale__;
        const yScale: d3.ScaleLinear<number, number> = (svgRef.current as any).__yScale__;
        if (!xScale || !yScale) return;

        const g = d3
            .select(svgRef.current)
            .select<SVGGElement>("g")
            .select<SVGGElement>(".marker-layer");

        g.selectAll(".marker-current").remove();
        const cx = xScale(currentX);
        const cy = yScale(currentY);

        if (isFinite(cx) && isFinite(cy)) {
            g.append("line")
                .attr("class", "marker-current")
                .attr("x1", cx).attr("x2", cx)
                .attr("y1", 0).attr("y2", innerH)
                .attr("stroke", "#6366f1").attr("stroke-width", 1)
                .attr("stroke-opacity", 0.5).attr("stroke-dasharray", "3 2");

            g.append("line")
                .attr("class", "marker-current")
                .attr("x1", 0).attr("x2", innerW)
                .attr("y1", cy).attr("y2", cy)
                .attr("stroke", "#6366f1").attr("stroke-width", 1)
                .attr("stroke-opacity", 0.5).attr("stroke-dasharray", "3 2");

            g.append("circle")
                .attr("class", "marker-current")
                .attr("cx", cx).attr("cy", cy).attr("r", 5)
                .attr("fill", "#6366f1")
                .attr("stroke", "white").attr("stroke-width", 1.5);
        }

        g.selectAll(".marker-proposed").remove();
        if (proposedX !== undefined && proposedY !== undefined) {
            const px = xScale(proposedX);
            const py = yScale(proposedY);
            if (isFinite(px) && isFinite(py) && isFinite(cx) && isFinite(cy)) {
                g.append("line")
                    .attr("class", "marker-proposed")
                    .attr("x1", cx).attr("y1", cy)
                    .attr("x2", px).attr("y2", py)
                    .attr("stroke", "#f97316").attr("stroke-width", 1.5)
                    .attr("marker-end", "url(#arrow-proposed)");

                g.append("circle")
                    .attr("class", "marker-proposed")
                    .attr("cx", px).attr("cy", py).attr("r", 4)
                    .attr("fill", "#f97316")
                    .attr("stroke", "white").attr("stroke-width", 1.5);
            }
        }
    }, [currentX, currentY, proposedX, proposedY, lossGrid, innerW, innerH]);

    const fs9 = fs(9);

    return (
        <CollapsibleHUD
            icon={<Map style={{ width: fs(15), height: fs(15) }} className="text-indigo-500" />}
            title="Loss Landscape"
            defaultOpen={true}
            style={{ width: fs(290) }}
        >
            {!lossGrid ? (
                <p className="text-slate-400 text-center" style={{ fontSize: fs9 }}>
                    Computing loss map...
                </p>
            ) : (
                <>
                    {/* Mode toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-3" style={{ fontSize: fs9 }}>
                        {ALL_MODES.map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                className={`flex-1 py-1 transition-colors ${
                                    mode === m
                                        ? "bg-indigo-500 text-white font-semibold"
                                        : "bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                            >
                                {MODE_LABELS[m]}
                            </button>
                        ))}
                    </div>

                    <svg
                        ref={svgRef}
                        width={svgSize}
                        height={svgSize}
                        style={{ display: "block", margin: "0 auto" }}
                    />

                    {/* Legend row */}
                    <div className="flex items-center justify-center mt-1" style={{ gap: fs(10) }}>
                        <span className="flex items-center" style={{ gap: fs(4), fontSize: fs9 }}>
                            <span style={{
                                display: "inline-block", width: fs(8), height: fs(8),
                                borderRadius: "50%", background: "#6366f1",
                            }} />
                            <span className="text-slate-500">Current</span>
                        </span>
                        <span className="flex items-center" style={{ gap: fs(4), fontSize: fs9 }}>
                            <span style={{
                                display: "inline-block", width: fs(8), height: fs(8),
                                borderRadius: "50%", background: "#f97316",
                            }} />
                            <span className="text-slate-500">Proposed</span>
                        </span>
                        <span className="flex items-center" style={{ gap: fs(4), fontSize: fs9 }}>
                            <span style={{
                                display: "inline-block", width: fs(16), height: fs(6),
                                background: "linear-gradient(to right, #ffffb2, #fd8d3c, #bd0026)",
                                borderRadius: fs(2),
                            }} />
                            <span className="text-slate-500">Loss</span>
                        </span>
                    </div>

                    {/* Live Loss readout */}
                    <div
                        className="mt-2 rounded-lg bg-white/70 border border-slate-100 text-center font-mono text-slate-600"
                        style={{ padding: `${fs(4)} ${fs(8)}`, fontSize: fs(11) }}
                    >
                        Loss = {computeLoss(currentX, currentY).toFixed(4)}
                    </div>
                </>
            )}
        </CollapsibleHUD>
    );
};

export default BaseLossMapHUD;
