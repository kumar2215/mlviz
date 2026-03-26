/**
 * SVM Classification D3 Renderer
 * Draws a scatter plot colored by class, with the decision boundary heatmap.
 */

import {
    renderDecisionBoundary2D,
} from "@/components/plots/dimensions/scatter2DrendererUtils";
import type { DecisionBoundary } from "@/components/plots/types";
import {
    renderLegend,
} from "@/components/plots/utils/legendHelper";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { createColorScale } from "@/utils/colorUtils";
import * as d3 from "d3";

export interface SVContribution {
    sv_index: number;
    alpha_y: number;
    sv_coords: number[];
    mean_abs_contribution: number;
    heatmap: number[];  // per-mesh-point signed contribution, length = resolution²
}

export interface RenderSVMProps {
    container: d3.Selection<SVGGElement, unknown, null, undefined>;
    points: number[][];       // [x1, x2]
    labels: number[];         // 0/1
    classNames: string[];     // display names for each class index
    supportVectorIndices?: number[];
    svContributions?: SVContribution[];
    boundaryResolution?: number;  // grid side length (default 50)
    x_range: number[];
    y_range: number[];
    xLabel: string;
    yLabel: string;
    context: VisualisationRenderContext;
    decisionBoundary?: DecisionBoundary;
}

export interface RenderResult {
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
}

export function renderSVM({
    container,
    points,
    labels,
    classNames,
    supportVectorIndices,
    svContributions,
    boundaryResolution = 50,
    x_range,
    y_range,
    xLabel,
    yLabel,
    context,
    decisionBoundary,
}: RenderSVMProps): RenderResult {
    const { width, height, margin } = context.dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // ---- Scales ----
    const xScale = d3.scaleLinear().domain(x_range).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(y_range).range([innerHeight, 0]);

    // ---- Clear previous render ----
    container.selectAll(".zoom-content, .axes-fixed, .svm-label").remove();

    const contentGroup = container.append("g").attr("class", "zoom-content");
    const axesGroup = container.append("g").attr("class", "axes-fixed");

    // ---- Color scale keyed by class name ----
    const colorScale = createColorScale(classNames, "default");

    // ---- Background regions (Decision Boundary heatmap) ----
    if (decisionBoundary) {
        renderDecisionBoundary2D(
            contentGroup,
            decisionBoundary,
            xScale,
            yScale,
            { type: "classification", labels: [], classNames } as any,
            0.15,
            colorScale as any,
        );
    }

    // ---- Axes ----
    const xAxisGroup = axesGroup.append("g").attr("class", "svm-axis-x x-axis").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(xScale).ticks(6)).call(g => {
        g.selectAll("text").style("font-size", "11px").style("fill", "#94a3b8");
        g.selectAll("line, path").style("stroke", "#e2e8f0");
    });
    const yAxisGroup = axesGroup.append("g").attr("class", "svm-axis-y y-axis").call(d3.axisLeft(yScale).ticks(6)).call(g => {
        g.selectAll("text").style("font-size", "11px").style("fill", "#94a3b8");
        g.selectAll("line, path").style("stroke", "#e2e8f0");
    });

    (xAxisGroup.node() as any).__xScale__ = xScale.copy();
    (yAxisGroup.node() as any).__yScale__ = yScale.copy();

    axesGroup.append("text").attr("class", "svm-label").attr("x", innerWidth / 2).attr("y", innerHeight + margin.bottom - 4).attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#64748b").text(xLabel);
    axesGroup.append("text").attr("class", "svm-label").attr("transform", "rotate(-90)").attr("x", -innerHeight / 2).attr("y", -margin.left + 14).attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#64748b").text(yLabel);

    // ---- Scatter points ----
    const scatterGroup = contentGroup.append("g").attr("class", "svm-scatter");
    const isSV = (i: number) => supportVectorIndices && supportVectorIndices.includes(i);

    scatterGroup.selectAll("circle.pt")
        .data(points)
        .join("circle")
        .attr("class", "pt")
        .attr("cx", d => xScale(d[0]))
        .attr("cy", d => yScale(d[1]))
        .attr("r", (_, i) => isSV(i) ? 6 : 4)
        .attr("fill", (_, i) => colorScale(classNames[labels[i]] ?? String(labels[i])))
        .attr("fill-opacity", 0.7)
        .attr("stroke", (_, i) => isSV(i) ? "#27272a" : "white")
        .attr("stroke-width", (_, i) => isSV(i) ? 2 : 0.5)
        .attr("data-class", (_, i) => classNames[labels[i]] ?? String(labels[i]));

    // ---- SV contribution heatmap (shown on hover) ----
    if (svContributions && svContributions.length > 0 && decisionBoundary?.meshPoints) {
        const contribByIndex = new Map(svContributions.map(c => [c.sv_index, c]));
        const res = boundaryResolution;
        const meshPts = decisionBoundary.meshPoints as number[][];

        // Mesh centers span from xDataMin to xDataMax across res points.
        // Step between centers = (max - min) / (res - 1).
        // Each cell extends half a step beyond its center on each side,
        // so total coverage = (max - min) + step = span * res / (res - 1).
        // Simplest: derive step from adjacent centers, cell size = step + 1px seam fix.
        const xStep = Math.abs(xScale(meshPts[1][0]) - xScale(meshPts[0][0]));
        const yStep = Math.abs(yScale(meshPts[res][1]) - yScale(meshPts[0][1]));
        const cellW = xStep + 1;
        const cellH = yStep + 1;

        // Global abs-max across all SVs for consistent color scaling
        const globalMax = Math.max(...svContributions.flatMap(c => c.heatmap.map(Math.abs)));

        // Diverging color scale: negative → blue, zero → white, positive → red
        const heatColorScale = d3.scaleDiverging(d3.interpolateRdBu)
            .domain([globalMax, 0, -globalMax]);

        // Clip heatmap to the inner plot area
        const clipId = "svm-heatmap-clip";
        contentGroup.append("clipPath").attr("id", clipId)
            .append("rect").attr("width", innerWidth).attr("height", innerHeight);

        const heatmapGroup = contentGroup.insert("g", ".svm-scatter")
            .attr("class", "svm-sv-heatmap")
            .attr("clip-path", `url(#${clipId})`)
            .style("opacity", "0")
            .style("pointer-events", "none");

        scatterGroup.selectAll<SVGCircleElement, number[]>("circle.pt")
            .on("mouseenter.heatmap", function(_event, d) {
                const i = points.indexOf(d);
                const contrib = contribByIndex.get(i);
                if (!contrib) return;

                heatmapGroup.selectAll("rect").remove();
                heatmapGroup.selectAll<SVGRectElement, number>("rect")
                    .data(contrib.heatmap)
                    .join("rect")
                    .attr("x", (_, k) => xScale(meshPts[k][0]) - cellW / 2)
                    .attr("y", (_, k) => yScale(meshPts[k][1]) - cellH / 2)
                    .attr("width", cellW)
                    .attr("height", cellH)
                    .attr("fill", v => heatColorScale(v));

                heatmapGroup.transition().duration(150).style("opacity", "1");
            })
            .on("mouseleave.heatmap", function(_event, d) {
                const i = points.indexOf(d);
                if (!contribByIndex.has(i)) return;
                heatmapGroup.transition().duration(150).style("opacity", "0")
                    .on("end", () => heatmapGroup.selectAll("rect").remove());
            });
    }

    // ---- Legend (tied to points + boundary regions) ----
    const config = { type: "classification" as const, classNames, labels: [] };
    const scaleFactor = width / 800;
    const legend = renderLegend(axesGroup, config, innerWidth, innerHeight, { position: "bottom-left" }, scaleFactor);

    if (legend) {
        legend.onFilterChange((focusedNames) => {
            // Dim/restore scatter points
            scatterGroup.selectAll<SVGCircleElement, unknown>("circle.pt")
                .transition().duration(200)
                .attr("fill", function (_, i) {
                    const name = classNames[labels[i]] ?? String(labels[i]);
                    if (focusedNames === null) return colorScale(name);
                    return focusedNames.has(name) ? colorScale(name) : "#d1d5db";
                })
                .attr("fill-opacity", function (_, i) {
                    if (focusedNames === null) return 0.7;
                    const name = classNames[labels[i]] ?? String(labels[i]);
                    return focusedNames.has(name) ? 0.7 : 0.3;
                });

            // Dim/restore decision boundary regions
            const boundaryRects = contentGroup.select(".decision-boundary").selectAll<SVGRectElement, unknown>("rect");
            if (!boundaryRects.empty()) {
                const categoricalScale = colorScale;
                boundaryRects.transition().duration(200)
                    .attr("fill", function () {
                        const prediction = d3.select(this).attr("data-prediction");
                        if (focusedNames === null) return categoricalScale(prediction);
                        return focusedNames.has(prediction) ? categoricalScale(prediction) : "#e5e7eb";
                    })
                    .attr("opacity", function () {
                        if (focusedNames === null) return 0.15;
                        const prediction = d3.select(this).attr("data-prediction");
                        return focusedNames.has(prediction) ? 0.15 : 0.05;
                    });
            }
        });
    }

    return { xScale, yScale };
}
