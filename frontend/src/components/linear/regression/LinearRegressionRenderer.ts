/**
 * Linear Regression D3 Renderer
 * Draws a scatter plot and an interactive regression line.
 */

import { renderManualLegend, type LegendFilterCallback, type LegendItem } from "@/components/plots/utils/legendHelper";
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
}

export interface RenderResult {
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    legend: { onFilterChange: (cb: LegendFilterCallback) => void } | null;
}

const SCATTER_COLOR = "#64748b";
const USER_LINE_COLOR = "#6366f1";    // indigo — user's line
const OPTIMAL_LINE_COLOR = "#10b981"; // emerald — OLS optimal line
const PROPOSED_LINE_COLOR = "#f97316"; // orange — proposed next step
const TEST_COLOR = "#f97316";         // orange — test set points

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
    container.selectAll(".lr-axis-x, .lr-axis-y, .lr-scatter, .lr-line-user, .lr-line-opt, .lr-line-proposed, .lr-label, .manual-legend").remove();

    // ---- Axes ----
    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3.axisLeft(yScale).ticks(6);

    container
        .append("g")
        .attr("class", "lr-axis-x")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis)
        .call((g) => {
            g.selectAll("text").style("font-size", "11px").style("fill", "#94a3b8");
            g.selectAll("line, path").style("stroke", "#e2e8f0");
        });

    container
        .append("g")
        .attr("class", "lr-axis-y")
        .call(yAxis)
        .call((g) => {
            g.selectAll("text").style("font-size", "11px").style("fill", "#94a3b8");
            g.selectAll("line, path").style("stroke", "#e2e8f0");
        });

    // Axis labels
    container
        .append("text")
        .attr("class", "lr-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text(xLabel);

    container
        .append("text")
        .attr("class", "lr-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 14)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text(yLabel);

    // ---- Scatter points ----
    const scatterGroup = container
        .append("g")
        .attr("class", "lr-scatter");

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
                : SCATTER_COLOR
        )
        .attr("fill-opacity", 0.55)
        .attr("stroke", (_, i) =>
            trainMask ? (trainMask[i] ? SCATTER_COLOR : TEST_COLOR) : SCATTER_COLOR
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
        opacity = 1
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

        container
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
            (focusedLabels === null || focusedLabels === undefined || focusedLabels.has("Optimal line")) ? 1 : 0
        );
    }

    // ---- Proposed next step line (dimmed dash, indigo) ----
    if (
        proposedSlope !== undefined &&
        proposedIntercept !== undefined
    ) {
        drawLine(
            proposedSlope,
            proposedIntercept,
            "lr-line-proposed",
            PROPOSED_LINE_COLOR,
            2,
            true,
            (focusedLabels === null || focusedLabels === undefined || focusedLabels.has("Proposed update")) ? 0.5 : 0
        );
    }

    // ---- User-controlled line (solid, indigo) ----
    const userLineOpacity = (focusedLabels === null || focusedLabels === undefined || focusedLabels.has("Your line")) ? 1 : 0;
    drawLine(currentSlope, currentIntercept, "lr-line-user", USER_LINE_COLOR, 2.5, false, userLineOpacity);

    // ---- Legend ----
    const finalLegendItems: LegendItem[] = legendItems || [];
    if (!legendItems) {
        finalLegendItems.push({ label: "Your line", color: USER_LINE_COLOR });
        if (showOptimalLine && optimalSlope !== undefined) {
            finalLegendItems.push({ label: "Optimal line", color: OPTIMAL_LINE_COLOR, dashed: true });
        }
        if (proposedSlope !== undefined) {
            finalLegendItems.push({ label: "Proposed update", color: PROPOSED_LINE_COLOR, dashed: true });
        }
    }

    const legend = renderManualLegend(
        container,
        finalLegendItems,
        innerWidth,
        innerHeight,
        { position: "bottom-left" },
        context.dimensions.width / 800, // Scale factor based on width
        focusedLabels
    );

    return { xScale, yScale, legend };
}
