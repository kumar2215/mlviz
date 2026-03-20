/**
 * Linear Regression D3 Renderer
 * Draws a scatter plot and an interactive regression line.
 */

import {
    renderManualLegend,
    type LegendFilterCallback,
    type LegendItem,
} from "@/components/plots/utils/legendHelper";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import * as d3 from "d3";

export interface RenderLinearRegressionProps {
    container: d3.Selection<SVGGElement, unknown, null, undefined>;
    /** Scatter points [[x, y], ...] */
    points: number[][];
    /** Current user-controlled line */
    currentSlope: number;
    currentIntercept: number;
    /** Optional optimal OLS line */
    optimalSlope?: number;
    optimalIntercept?: number;
    /** Optional proposed next step line */
    proposedSlope?: number;
    proposedIntercept?: number;
    xRange: number[];
    yRange: number[];
    xLabel: string;
    yLabel: string;
    context: VisualisationRenderContext;
    showOptimalLine?: boolean;
    /** Color points by train/test split (optional) */
    trainMask?: boolean[];
    /** Custom legend items (optional) */
    legendItems?: LegendItem[];
    /** Set of focused labels for toggling visibility */
    focusedLabels?: Set<string> | null;
    /** Draw vertical residual lines from each point to the current line */
    showErrorLines?: boolean;
}

export interface RenderResult {
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    legend: { onFilterChange: (cb: LegendFilterCallback) => void } | null;
}

const SCATTER_COLOR = "#64748b";
const ERROR_LINE_COLOR = "#ef4444"; // red — residual error lines
const USER_LINE_COLOR = "#6366f1"; // indigo — user's line
const OPTIMAL_LINE_COLOR = "#10b981"; // emerald — OLS optimal line
const PROPOSED_LINE_COLOR = "#f97316"; // orange — proposed next step
const TEST_COLOR = "#f97316"; // orange — test set points

export function renderLinearRegression({
    container,
    points,
    currentSlope,
    currentIntercept,
    optimalSlope,
    optimalIntercept,
    proposedSlope,
    proposedIntercept,
    xRange,
    yRange,
    xLabel,
    yLabel,
    context,
    showOptimalLine = false,
    trainMask,
    legendItems,
    focusedLabels,
    showErrorLines = false,
}: RenderLinearRegressionProps): RenderResult {
    const { width, height, margin } = context.dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // ---- Scales ----
    const xScale = d3
        .scaleLinear()
        .domain(xRange)
        .range([0, innerWidth])
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain(yRange)
        .range([innerHeight, 0])
        .nice();

    // ---- Clear previous render ----
    container
        .selectAll(
            ".zoom-content, .axes-fixed, .lr-label",
        )
        .remove();

    // ---- Group structure (mirrors scatter2D pattern for zoom support) ----
    // .zoom-content  — zoomable: scatter, lines, error lines
    // .axes-fixed    — fixed: axes + white backgrounds + axis labels
    const contentGroup = container.append("g").attr("class", "zoom-content");
    const axesGroup = container.append("g").attr("class", "axes-fixed");

    // ---- Axes (fixed, on top of content) ----
    // White backgrounds so zoomed content doesn't bleed under axes
    const leftCoverage = margin.left + 10;
    const bottomCoverage = margin.bottom + 20;

    axesGroup
        .append("rect")
        .attr("x", -leftCoverage)
        .attr("y", innerHeight - 1)
        .attr("width", innerWidth + leftCoverage + (margin.right + 10))
        .attr("height", bottomCoverage)
        .attr("fill", "white")
        .attr("opacity", 1);

    axesGroup
        .append("rect")
        .attr("x", -leftCoverage)
        .attr("y", -10)
        .attr("width", leftCoverage)
        .attr("height", innerHeight + 20)
        .attr("fill", "white")
        .attr("opacity", 1);

    axesGroup
        .append("rect")
        .attr("x", -leftCoverage)
        .attr("y", -(margin.top + 10))
        .attr("width", innerWidth + leftCoverage + (margin.right + 10))
        .attr("height", margin.top + 10)
        .attr("fill", "white")
        .attr("opacity", 1);

    axesGroup
        .append("rect")
        .attr("x", innerWidth)
        .attr("y", -10)
        .attr("width", margin.right + 10)
        .attr("height", innerHeight + 20)
        .attr("fill", "white")
        .attr("opacity", 1);

    const xAxisGroup = axesGroup
        .append("g")
        .attr("class", "lr-axis-x x-axis")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((g) => {
            g.selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#94a3b8");
            g.selectAll("line, path").style("stroke", "#e2e8f0");
        });

    // Store original scale for zoom rescaling
    (xAxisGroup.node() as any).__xScale__ = xScale.copy();

    const yAxisGroup = axesGroup
        .append("g")
        .attr("class", "lr-axis-y y-axis")
        .call(d3.axisLeft(yScale).ticks(6))
        .call((g) => {
            g.selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#94a3b8");
            g.selectAll("line, path").style("stroke", "#e2e8f0");
        });

    // Store original scale for zoom rescaling
    (yAxisGroup.node() as any).__yScale__ = yScale.copy();

    // Axis labels
    axesGroup
        .append("text")
        .attr("class", "lr-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text(xLabel);

    axesGroup
        .append("text")
        .attr("class", "lr-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 14)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text(yLabel);

    // ---- Residual error lines (rendered before points so points sit on top) ----
    if (showErrorLines) {
        const errorVisible =
            focusedLabels === null ||
            focusedLabels === undefined ||
            focusedLabels.has("Error lines");
        const errorGroup = contentGroup
            .append("g")
            .attr("class", "lr-error-lines");
        errorGroup
            .selectAll("line")
            .data(points)
            .join("line")
            .attr("x1", (d) => xScale(d[0]))
            .attr("x2", (d) => xScale(d[0]))
            .attr("y1", (d) => yScale(d[1]))
            .attr("y2", (d) => yScale(currentSlope * d[0] + currentIntercept))
            .attr("stroke", ERROR_LINE_COLOR)
            .attr("stroke-width", 1)
            .attr("stroke-opacity", errorVisible ? 0.4 : 0)
            .style("stroke-dasharray", "3, 3");
    }

    // ---- Scatter points ----
    const scatterGroup = contentGroup.append("g").attr("class", "lr-scatter");

    scatterGroup
        .selectAll("circle")
        .data(points)
        .join("circle")
        .attr("cx", (d) => xScale(d[0]))
        .attr("cy", (d) => yScale(d[1]))
        .attr("r", 4)
        .attr("fill", (_, i) =>
            trainMask
                ? trainMask[i]
                    ? SCATTER_COLOR
                    : TEST_COLOR
                : SCATTER_COLOR,
        )
        .attr("fill-opacity", 0.55)
        .attr("stroke", (_, i) =>
            trainMask
                ? trainMask[i]
                    ? SCATTER_COLOR
                    : TEST_COLOR
                : SCATTER_COLOR,
        )
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.7);

    // ---- Line drawing helper ----
    const drawLine = (
        slope: number,
        intercept: number,
        className: string,
        color: string,
        strokeWidth = 2,
        dashed = false,
        opacity = 1,
    ) => {
        const [x0, x1] = xScale.domain();
        const lineData: [number, number][] = [
            [x0, slope * x0 + intercept],
            [x1, slope * x1 + intercept],
        ];
        const lineGen = d3
            .line<[number, number]>()
            .x((d) => xScale(d[0]))
            .y((d) => yScale(d[1]));

        contentGroup
            .append("path")
            .attr("class", className)
            .datum(lineData)
            .attr("d", lineGen)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", strokeWidth)
            .attr("stroke-dasharray", dashed ? "6 4" : null)
            .attr("stroke-linecap", "round")
            .attr("opacity", opacity);
    };

    // ---- Optimal OLS line (dashed, green) ----
    if (
        showOptimalLine &&
        optimalSlope !== undefined &&
        optimalIntercept !== undefined
    ) {
        drawLine(
            optimalSlope,
            optimalIntercept,
            "lr-line-opt",
            OPTIMAL_LINE_COLOR,
            2,
            true,
            focusedLabels === null ||
                focusedLabels === undefined ||
                focusedLabels.has("Optimal line")
                ? 1
                : 0,
        );
    }

    // ---- Proposed next step line (dimmed dash, indigo) ----
    if (proposedSlope !== undefined && proposedIntercept !== undefined) {
        drawLine(
            proposedSlope,
            proposedIntercept,
            "lr-line-proposed",
            PROPOSED_LINE_COLOR,
            2,
            true,
            focusedLabels === null ||
                focusedLabels === undefined ||
                focusedLabels.has("Proposed update")
                ? 0.5
                : 0,
        );
    }

    // ---- User-controlled line (solid, indigo) ----
    const userLineOpacity =
        focusedLabels === null ||
        focusedLabels === undefined ||
        focusedLabels.has("Your line")
            ? 1
            : 0;
    drawLine(
        currentSlope,
        currentIntercept,
        "lr-line-user",
        USER_LINE_COLOR,
        2.5,
        false,
        userLineOpacity,
    );

    // ---- Legend ----
    const finalLegendItems: LegendItem[] = legendItems || [];
    if (!legendItems) {
        finalLegendItems.push({ label: "Your line", color: USER_LINE_COLOR });
        if (showOptimalLine && optimalSlope !== undefined) {
            finalLegendItems.push({
                label: "Optimal line",
                color: OPTIMAL_LINE_COLOR,
                dashed: true,
            });
        }
        if (proposedSlope !== undefined) {
            finalLegendItems.push({
                label: "Proposed update",
                color: PROPOSED_LINE_COLOR,
                dashed: true,
            });
        }
        if (showErrorLines) {
            finalLegendItems.push({
                label: "Error lines",
                color: ERROR_LINE_COLOR,
            });
        }
    }

    const legend = renderManualLegend(
        axesGroup,
        finalLegendItems,
        innerWidth,
        innerHeight,
        { position: "bottom-left" },
        context.dimensions.width / 800, // Scale factor based on width
        focusedLabels,
    );

    return { xScale, yScale, legend };
}
