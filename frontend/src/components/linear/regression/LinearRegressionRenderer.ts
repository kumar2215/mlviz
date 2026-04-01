/**
 * Linear Regression D3 Renderer
 * Draws a scatter plot and an interactive regression line.
 */

import { renderScatter2D } from "@/components/plots/dimensions/scatter2DrendererUtils";
import type { RegressionConfig } from "@/components/plots/types";
import { createPlotPoints } from "@/components/plots/utils/dataTransformers";
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
    /** Interaction callback for legend */
    onLegendFilterChange?: LegendFilterCallback;
    /** Highlighted prediction point (blue dot) */
    predictionPoint?: [number, number] | null;
}

export interface RenderResult {
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    legend: {
        onFilterChange: (cb: LegendFilterCallback) => void;
    } | null;
}

const TRAIN_COLOR = "#64748b"; // slate-500
const TEST_COLOR = "#94a3b8"; // slate-400
const USER_LINE_COLOR = "#3b82f6"; // blue-500
const OPTIMAL_LINE_COLOR = "#10b981"; // emerald-500
const PROPOSED_LINE_COLOR = "#6366f1"; // indigo-500
const ERROR_LINE_COLOR = "#ef4444"; // red-500
const PREDICTION_POINT_COLOR = "#3b82f6"; // blue-500

/**
 * Main render function for Linear Regression.
 * Uses renderScatter2D for the base plot and layers regression lines on top.
 */
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
    showOptimalLine = true,
    trainMask,
    legendItems,
    focusedLabels,
    showErrorLines = false,
    onLegendFilterChange,
    predictionPoint,
}: RenderLinearRegressionProps): RenderResult {
    const { width, height, margin, scaleFactor = 1 } = context.dimensions;

    // ---- Clear previous render ----
    container.selectAll("*").remove();

    // ---- Prepare Plot Data ----
    const config: RegressionConfig = {
        type: "regression",
        values: points.map((_, i) => (trainMask ? (trainMask[i] ? 1 : 0) : 0)),
        colorScheme: "blues",
    };

    const plotPoints = createPlotPoints(points, config);
    const bounds = {
        min: [xRange[0], yRange[0]],
        max: [xRange[1], yRange[1]],
    };

    // ---- Main Render via Plot Utils ----
    const renderResult = renderScatter2D(
        container,
        plotPoints,
        bounds,
        [xLabel, yLabel],
        config,
        undefined, 
        {
            width,
            height,
            margin,
            pointRadius: 4 * scaleFactor,
            pointOpacity: 0.8,
            showGrid: true,
            showLegend: false, 
            showAxes: true,
            useNiceScales: false,
            scaleFactor,
        },
    );

    const { xScale, yScale, contentGroup, axesGroup } = renderResult;

    // ---- Apply Train/Test split coloring if mask exists ----
    if (trainMask) {
        contentGroup
            .selectAll("circle")
            .attr("fill", (_, i) => (trainMask[i] ? TRAIN_COLOR : TEST_COLOR))
            .attr("fill-opacity", (_, i) => {
                if (!focusedLabels) return 0.8;
                const label = trainMask[i] ? "Train" : "Test";
                return focusedLabels.has(label) ? 0.8 : 0.15;
            });
    }

    // ---- Optimal OLS Line ----
    if (showOptimalLine && optimalSlope !== undefined && optimalIntercept !== undefined) {
        const isVisible = !focusedLabels || focusedLabels.has("Optimal line");
        if (isVisible) {
            drawLine(
                contentGroup,
                optimalSlope,
                optimalIntercept,
                xScale,
                yScale,
                OPTIMAL_LINE_COLOR,
                2 * scaleFactor,
                "4 2",
                0.6,
            );
        }
    }

    // ---- Proposed Gradient Step Line (Ghost line) ----
    if (proposedSlope !== undefined && proposedIntercept !== undefined) {
        const isVisible = !focusedLabels || focusedLabels.has("Proposed update");
        if (isVisible) {
            drawLine(
                contentGroup,
                proposedSlope,
                proposedIntercept,
                xScale,
                yScale,
                PROPOSED_LINE_COLOR,
                2 * scaleFactor,
                "10 5",
                0.4,
            );
        }
    }

    // ---- Current User/Model Line ----
    const isUserVisible = !focusedLabels || focusedLabels.has("Your line");
    if (isUserVisible) {
        drawLine(
            contentGroup,
            currentSlope,
            currentIntercept,
            xScale,
            yScale,
            USER_LINE_COLOR,
            3 * scaleFactor,
            "",
            1.0,
        );
    }

    // ---- Error (Residual) Lines ----
    if (showErrorLines) {
        const isVisible = !focusedLabels || focusedLabels.has("Error lines");
        if (isVisible) {
            contentGroup
                .selectAll("line.error")
                .data(points)
                .join("line")
                .attr("class", "error")
                .attr("x1", (d) => xScale(d[0]))
                .attr("y1", (d) => yScale(d[1]))
                .attr("x2", (d) => xScale(d[0]))
                .attr("y2", (d) => yScale(currentSlope * d[0] + currentIntercept))
                .attr("stroke", ERROR_LINE_COLOR)
                .attr("stroke-width", 1 * scaleFactor)
                .attr("stroke-dasharray", "2 2")
                .attr("opacity", 0.5);
        }
    }

    // ---- Highlight Prediction Point ----
    if (predictionPoint) {
        const isVisible = !focusedLabels || focusedLabels.has("Prediction");
        if (isVisible) {
            contentGroup
                .append("circle")
                .attr("cx", xScale(predictionPoint[0]))
                .attr("cy", yScale(predictionPoint[1]))
                .attr("r", 7 * scaleFactor)
                .attr("fill", PREDICTION_POINT_COLOR)
                .attr("stroke", "white")
                .attr("stroke-width", 2 * scaleFactor)
                .attr("filter", "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))");
        }
    }

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
        if (predictionPoint) {
            finalLegendItems.push({
                label: "Prediction",
                color: PREDICTION_POINT_COLOR,
            });
        }
    }

    const legend = renderManualLegend(
        axesGroup,
        finalLegendItems,
        width - margin.left - margin.right,
        height - margin.top - margin.bottom,
        { position: "bottom-left" },
        scaleFactor,
        focusedLabels,
    );

    if (legend && onLegendFilterChange) {
        legend.onFilterChange(onLegendFilterChange);
    }

    return { xScale, yScale, legend };
}

/**
 * Generic line drawing helper
 */
function drawLine(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    slope: number,
    intercept: number,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    color: string,
    strokeWidth: number,
    dashArray: string = "",
    opacity: number = 1,
) {
    const [x0, x1] = xScale.domain();
    const y0 = slope * x0 + intercept;
    const y1 = slope * x1 + intercept;

    container
        .append("line")
        .attr("x1", xScale(x0))
        .attr("y1", yScale(y0))
        .attr("x2", xScale(x1))
        .attr("y2", yScale(y1))
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-dasharray", dashArray || null)
        .attr("stroke-linecap", "round")
        .attr("opacity", opacity);
}
