/**
 * KNN Renderer
 * D3-based rendering functions for K-Nearest Neighbors visualization
 * Follows the pattern from DecisionTreeRenderer and histogramUtils
 */

import type {
    KNNVisualizationData,
    RenderKNNVisualisationProps,
} from "@/components/knn/classifier/types";
import type { ClassificationConfig } from "@/components/plots/types";
import {
    calculateCombinedBounds,
    createPlotPoints,
} from "@/components/plots/utils/dataTransformers";
import {
    renderScatter1D,
    renderScatter2D
} from "@/components/plots/utils/scatterRenderers";
import {
    calculateInterpolationFactor,
    isElementVisible,
} from "@/components/visualisation/utils/interpolationUtils";
import * as d3 from "d3";

// ============================================================================
// Main Render Functions
// ============================================================================

/**
 * Renders KNN visualization for training/exploration mode
 * Shows training data with decision boundary
 */
export function renderKNNTraining({
    container,
    data,
    context,
    props,
}: RenderKNNVisualisationProps) {
    const { dimensions, state } = context;
    const { width, height, margin, scaleFactor = 1 } = dimensions;
    const { currentStep = 0 } = state;
    const dimensions_to_render = data.nDimensions;

    console.log("[KNNRenderer] renderKNNTraining called with:", {
        dataPointsCount: data.trainingPoints?.length,
        labelsCount: data.trainingLabels?.length,
        hasDecisionBoundary: !!data.decisionBoundary,
        nDimensions: data.nDimensions,
        k: data.k,
    });

    // Clear previous render
    container.selectAll("*").remove();

    // Prepare plot data
    const plotData = data.trainingPoints;
    const config: ClassificationConfig = {
        type: "classification",
        classNames: data.classNames,
        labels: data.trainingLabels,
    };

    // Create decision boundary if available
    const decisionBoundary = data.decisionBoundary
        ? {
              type: "classification" as const,
              meshPoints: data.decisionBoundary.meshPoints,
              predictions: data.decisionBoundary.predictions,
              dimensions: data.decisionBoundary.dimensions,
          }
        : undefined;

    // Transform data to plot points
    const plotPoints = createPlotPoints(plotData, config);
    // Use 0 padding when decision boundary exists (it already has 10% margin from backend)
    const bounds = calculateCombinedBounds(plotData, decisionBoundary, decisionBoundary ? 0 : 0.1);

    console.log("[KNNRenderer] Plotting info:", {
        plotPointsCount: plotPoints.length,
        bounds,
        dimensions_to_render
    });

    // Render options
    const renderOptions = {
        width,
        height,
        margin,
        pointRadius: 4 * scaleFactor,
        pointOpacity: 0.8,
        showGrid: true,
        showLegend: true,
        showAxes: true,
        useNiceScales: !decisionBoundary,  // Disable nice scales when decision boundary exists to avoid whitespace
        scaleFactor,
    };

    // Render appropriate scatter plot based on dimensions
    let renderResult: any;
    switch (dimensions_to_render) {
        case 1:
            renderResult = renderScatter1D(
                container,
                plotPoints,
                bounds,
                data.featureNames,
                config,
                decisionBoundary,
                renderOptions
            );
            break;
        case 2:
        default:
            renderResult = renderScatter2D(
                container,
                plotPoints,
                bounds,
                data.featureNames,
                config,
                decisionBoundary,
                renderOptions
            );
            break;
    }

    const targetGroup = renderResult?.contentGroup || container;



    // Add custom tooltips to all training points
    addTrainingPointTooltips(container, data, plotPoints);

    // If there are queries (selected points), render neighbor visualization
    if (data.queries && data.queries.length > 0) {
        const query = data.queries[0]; // Use first query (only one for training mode)

        if (dimensions_to_render === 2) {
            render2DQueryVisualization(
                targetGroup,
                query,
                data,
                renderResult.xScale,
                renderResult.yScale,
                {
                    colorScale: props.colorScale,
                    k: props.k,
                    showNeighborLines: true,
                    showDistanceCircles: false,
                    neighborLineColor: "#666",
                    neighborLineWidth: 1.5 * scaleFactor,
                    queryPointSize: 8 * scaleFactor,
                    highlightColor: "#666",
                    interpolationFactor: 1,
                    scaleFactor,
                }
            );
        } else if (dimensions_to_render === 1) {
            const innerHeight = height - margin.top - margin.bottom;
            render1DQueryVisualization(
                targetGroup,
                query,
                data,
                renderResult.xScale,
                innerHeight / 2,
                {
                    colorScale: props.colorScale,
                    k: props.k,
                    showNeighborLines: true,
                    neighborLineColor: "#666",
                    neighborLineWidth: 1.5 * scaleFactor,
                    queryPointSize: 8 * scaleFactor,
                    highlightColor: "#ff6b6b",
                    interpolationFactor: 1,
                    scaleFactor,
                }
            );
        }
    }

    // Apply interpolation if in playback mode
    // Note: Only apply interpolation if we're actually in playback mode (maxSteps > 0)
    // For static training visualization, skip interpolation to keep points fully visible
    const maxSteps = context.state.maxSteps || 0;
    if (currentStep !== undefined && maxSteps > 0) {
        applyInterpolation(container, currentStep, context);
    }

    return renderResult;
}

/**
 * Renders KNN visualization for prediction mode
 * Shows training data, query points, and neighbor connections
 */
export function renderKNNPrediction({
    container,
    data,
    context,
    props,
}: RenderKNNVisualisationProps) {
    const { dimensions, state } = context;
    const { height, margin, scaleFactor = 1 } = dimensions;
    const {
        colorScale,
        k,
        showNeighborLines = true,
        showDistanceCircles = false,
        neighborLineColor = "#666",
        neighborLineWidth = 1.5 * scaleFactor,
        queryPointSize = 8 * scaleFactor,
        highlightColor = "#ff6b6b",
    } = props;
    const { currentStep = 0 } = state;

    // Clear previous render
    container.selectAll("*").remove();

    // First, render the base visualization (training data + decision boundary)
    const baseRenderResult = renderKNNTraining({ container, data, context, props });
    const targetGroup = baseRenderResult?.contentGroup || container;

    // If no queries, we're done
    if (!data.queries || data.queries.length === 0) {
        return;
    }

    // Determine which query to show based on current step
    const visibleQueryIndex = Math.min(currentStep, data.queries.length - 1);
    const currentQuery = data.queries[visibleQueryIndex];

    // Calculate interpolation factor for smooth animations
    const interpolationFactor = calculateInterpolationFactor(
        visibleQueryIndex,
        context
    );

    // Only show if element is visible (for playback)
    if (!isElementVisible(visibleQueryIndex, context)) {
        return;
    }

    // Setup for rendering query-specific elements
    const dimensions_to_render = data.nDimensions;

    if (dimensions_to_render === 2 && baseRenderResult) {
        render2DQueryVisualization(
            targetGroup,
            currentQuery,
            data,
            baseRenderResult.xScale,
            baseRenderResult.yScale,
            {
                colorScale,
                k,
                showNeighborLines,
                showDistanceCircles,
                neighborLineColor,
                neighborLineWidth,
                queryPointSize,
                highlightColor,
                interpolationFactor,
                scaleFactor,
            }
        );
    } else if (dimensions_to_render === 1 && baseRenderResult) {
        const innerHeight = height - margin.top - margin.bottom;
        render1DQueryVisualization(
            targetGroup,
            currentQuery,
            data,
            baseRenderResult.xScale,
            innerHeight / 2,
            {
                colorScale,
                k,
                showNeighborLines,
                neighborLineColor,
                neighborLineWidth,
                queryPointSize,
                highlightColor,
                interpolationFactor,
                scaleFactor,
            }
        );
    }
}

// ============================================================================
// Helper Functions - 2D Query Visualization
// ============================================================================

function render2DQueryVisualization(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    query: any,
    data: KNNVisualizationData,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    options: {
        colorScale: d3.ScaleOrdinal<string, string>;
        k: number;
        showNeighborLines: boolean;
        showDistanceCircles: boolean;
        neighborLineColor: string;
        neighborLineWidth: number;
        queryPointSize: number;
        highlightColor: string;
        interpolationFactor: number;
        scaleFactor: number;
    }
) {
    const {
        colorScale,
        k,
        showNeighborLines,
        showDistanceCircles,
        neighborLineWidth,
        queryPointSize,
        highlightColor,
        interpolationFactor,
        scaleFactor,
    } = options;

    if (!xScale || !yScale) {
        console.error("[KNNRenderer] Missing scales for 2D query visualization");
        return;
    }

    if (!query?.queryPoint || query.queryPoint.length < 2) {
        console.warn("[KNNRenderer] Malformed query point for 2D visualization:", query);
        return;
    }

    const qX = xScale(query.queryPoint[0]);
    const qY = yScale(query.queryPoint[1]);

    if (isNaN(qX) || isNaN(qY)) {
        console.warn("[KNNRenderer] Query point resulted in NaN coordinates:", {
            point: query.queryPoint,
            qX,
            qY,
            xDomain: xScale.domain(),
            yDomain: yScale.domain()
        });
        return;
    }

    const queryGroup = container.append("g").attr("class", "knn-query");
    const tooltip = setupKNNTooltip();

    // Draw distance circle if enabled
    if (showDistanceCircles && query.neighbors.length > 0) {
        const maxNeighbor = query.neighbors[k - 1];
        const maxDistance = maxNeighbor.distance;

        // Convert distance to screen coordinates (approximate)
        const xDist =
            xScale(query.queryPoint[0] + maxDistance) -
            xScale(query.queryPoint[0]);

        queryGroup
            .append("circle")
            .attr("class", "knn-distance-circle")
            .attr("cx", xScale(query.queryPoint[0]))
            .attr("cy", yScale(query.queryPoint[1]))
            .attr("r", xDist)
            .attr("fill", "none")
            .attr("stroke", highlightColor)
            .attr("stroke-width", 1 * scaleFactor)
            .attr("stroke-dasharray", `${5 * scaleFactor},${5 * scaleFactor}`)
            .attr("opacity", 0.3 * interpolationFactor);
    }

    // Draw lines to ALL points
    if (showNeighborLines) {
        const neighborSet = new Set(
            query.neighbors.slice(0, k).map((n: any) => n.index)
        );
        const pointRadius = 5 * scaleFactor; // Should match the actual point radius

        // Create a group for lines (will be behind hover circles)
        const linesGroup = queryGroup
            .append("g")
            .attr("class", "distance-lines");

        // Draw lines to all training points
        const lineData: Array<{
            trainingPoint: number[];
            idx: number;
            isNeighbor: boolean;
            distance: number;
            line: d3.Selection<SVGLineElement, unknown, null, undefined>;
        }> = [];

        data.trainingPoints.forEach((trainingPoint: number[], idx: number) => {
            // Skip the query point itself
            if (
                trainingPoint[0] === query.queryPoint[0] &&
                trainingPoint[1] === query.queryPoint[1]
            ) {
                return;
            }

            const isNeighbor = neighborSet.has(idx);
            const distance = query.allDistances[idx];

            const tx = xScale(trainingPoint[0]);
            const ty = yScale(trainingPoint[1]);

            if (isNaN(tx) || isNaN(ty)) return;

            // Calculate angle from query point to training point
            const dx = tx - qX;
            const dy = ty - qY;
            const angle = Math.atan2(dy, dx);

            // Calculate edge points (offset by circle radius)
            const x1 = qX + pointRadius * Math.cos(angle);
            const y1 = qY + pointRadius * Math.sin(angle);
            const x2 = tx - pointRadius * Math.cos(angle);
            const y2 = ty - pointRadius * Math.sin(angle);

            if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;

            // Create line
            const line = linesGroup
                .append("line")
                .attr(
                    "class",
                    isNeighbor ? "knn-neighbor-line" : "knn-other-line"
                )
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .attr("stroke", isNeighbor ? highlightColor : "#ccc")
                .attr("stroke-width", isNeighbor ? neighborLineWidth : 0.5 * scaleFactor)
                .attr(
                    "opacity",
                    (isNeighbor ? 0.7 : 0.15) * interpolationFactor
                )
                .attr("data-point-index", idx);

            lineData.push({ trainingPoint, idx, isNeighbor, distance, line });
        });

        // Create hover circles over each training point (except query point)
        const hoverGroup = queryGroup
            .append("g")
            .attr("class", "hover-targets");

        lineData.forEach(
            ({ trainingPoint, idx, isNeighbor, distance, line }) => {
                // Get the class label for this point
                const classLabel = data.trainingLabels[idx];

                // Create tooltip content
                const tooltipContent = `
                    <div class="font-semibold text-gray-900 mb-1">Neighbor Point</div>
                    <div class="text-sm text-gray-700">Class: <span class="font-semibold">${classLabel}</span></div>
                    <div class="text-sm text-gray-700">Distance: ${distance.toFixed(4)}</div>
                `;

                // Create invisible larger circle for hover detection
                const hoverCircle = hoverGroup
                    .append("circle")
                    .attr("cx", xScale(trainingPoint[0]))
                    .attr("cy", yScale(trainingPoint[1]))
                    .attr("r", pointRadius + 3 * scaleFactor) // Slightly larger for easier hover
                    .attr("fill", "transparent")
                    .attr("data-point-index", idx)
                    .style("cursor", "default")
                    .style("pointer-events", "all");

                // Hover behavior - show tooltip
                hoverCircle
                    .on("mousemove", function (event: any) {
                        // Highlight the line
                        line.attr(
                            "stroke-width",
                            isNeighbor ? neighborLineWidth + 1 : 1.5
                        ).attr("opacity", 0.9);

                        // Show HTML tooltip
                        tooltip.html(tooltipContent);
                        tooltip
                            .style("background-color", "white")
                            .style("color", "black")
                            .style("opacity", 0.8)
                            .style("left", event.pageX + 15 + "px")
                            .style("top", event.pageY - 10 + "px");
                    })
                    .on("mouseleave", function () {
                        // Reset line
                        line.attr(
                            "stroke-width",
                            isNeighbor ? neighborLineWidth : 0.5
                        ).attr(
                            "opacity",
                            (isNeighbor ? 0.7 : 0.15) * interpolationFactor
                        );

                        tooltip.style("opacity", 0);
                    });
            }
        );
    }

    // Highlight neighbor points
    query.neighbors.slice(0, k).forEach((neighbor: any) => {
        const trainingPoint = data.trainingPoints[neighbor.index];

        queryGroup
            .append("circle")
            .attr("class", "knn-neighbor-highlight")
            .attr("cx", xScale(trainingPoint[0]))
            .attr("cy", yScale(trainingPoint[1]))
            .attr("r", 7 * scaleFactor)
            .attr("fill", "none")
            .attr("stroke", highlightColor)
            .attr("stroke-width", 2.5 * scaleFactor)
            .attr("opacity", 0.8 * interpolationFactor);
    });

    // Draw query point
    const queryPointCircle = queryGroup
        .append("circle")
        .attr("class", "knn-query-point")
        .attr("cx", xScale(query.queryPoint[0]))
        .attr("cy", yScale(query.queryPoint[1]))
        .attr("r", queryPointSize)
        .attr("fill", colorScale(query.prediction))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2.5 * scaleFactor)
        .attr("opacity", interpolationFactor);

    // Add query point marker (X or star)
    queryGroup
        .append("text")
        .attr("class", "knn-query-marker")
        .attr("x", xScale(query.queryPoint[0]))
        .attr("y", yScale(query.queryPoint[1]))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .attr("pointer-events", "none")
        .text("?")
        .attr("opacity", interpolationFactor);

    // Create an invisible larger circle for better hover interaction
    const queryHoverTarget = queryGroup
        .append("circle")
        .attr("class", "knn-query-hover-target")
        .attr("cx", xScale(query.queryPoint[0]))
        .attr("cy", yScale(query.queryPoint[1]))
        .attr("r", queryPointSize + 5 * scaleFactor)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .style("pointer-events", "all");

    // Ensure the query point and its hover target are on top
    queryPointCircle.raise();
    queryGroup.select(".knn-query-marker").raise();
    queryHoverTarget.raise();

    // Use prediction name or fallback
    const predictionLabel = query.prediction || "Not yet calculated";

    // Add interactive tooltip for query point
    const queryTooltipContent = `
        <div class="font-semibold text-gray-900 mb-1">Prediction: <span class="text-blue-600">${predictionLabel}</span></div>
        <div class="text-xs text-gray-500 mb-2">Nearest Neighbors (k=${k}):</div>
        <div class="space-y-1 max-h-40 overflow-y-auto">
            ${query.neighbors && query.neighbors.length > 0 ? 
                query.neighbors.slice(0, k).map((n: any, i: number) => `
                <div class="flex justify-between items-center text-xs border-b border-gray-100 pb-1">
                    <span class="text-gray-700">#${i + 1} ${n.label}</span>
                    <span class="font-mono text-gray-400">d=${n.distance.toFixed(3)}</span>
                </div>
            `).join("") : '<div class="text-xs text-gray-400 italic">No neighbors available</div>'}
        </div>
    `;

    queryHoverTarget
        .on("mouseover", function (event: any) {
            tooltip.html(queryTooltipContent);
            tooltip
                .style("background-color", "white")
                .style("color", "black")
                .style("opacity", 0.95)
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mousemove", function (event: any) {
            tooltip
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
        });
}

// ============================================================================
// Helper Functions - 1D Query Visualization
// ============================================================================

function render1DQueryVisualization(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    query: any,
    data: KNNVisualizationData,
    xScale: d3.ScaleLinear<number, number>,
    stripCenter: number,
    options: {
        colorScale: d3.ScaleOrdinal<string, string>;
        k: number;
        showNeighborLines: boolean;
        neighborLineColor: string;
        neighborLineWidth: number;
        queryPointSize: number;
        highlightColor: string;
        interpolationFactor: number;
        scaleFactor: number;
    }
) {
    const {
        colorScale,
        k,
        showNeighborLines,
        neighborLineWidth,
        queryPointSize,
        highlightColor,
        interpolationFactor,
        scaleFactor,
    } = options;

    if (!xScale) {
        console.error("[KNNRenderer] Missing xScale for 1D query visualization");
        return;
    }

    if (!query?.queryPoint || query.queryPoint.length < 1) {
        console.warn("[KNNRenderer] Malformed query point for 1D visualization:", query);
        return;
    }

    const qX = xScale(query.queryPoint[0]);
    if (isNaN(qX)) {
        console.warn("[KNNRenderer] Query point resulted in NaN coordinates (1D):", {
            point: query.queryPoint,
            qX,
            domain: xScale.domain()
        });
        return;
    }

    const queryGroup = container.append("g").attr("class", "knn-query");
    const tooltip = setupKNNTooltip();

    // Draw lines to ALL points
    if (showNeighborLines) {
        const neighborSet = new Set(
            query.neighbors.slice(0, k).map((n: any) => n.index)
        );
        const pointRadius = 6 * scaleFactor; // Should match the actual point radius for 1D

        // Create a group for lines (will be behind hover circles)
        const linesGroup = queryGroup
            .append("g")
            .attr("class", "distance-lines");

        // Draw lines to all training points
        const lineData: Array<{
            trainingPoint: number[];
            idx: number;
            isNeighbor: boolean;
            distance: number;
            line: d3.Selection<SVGLineElement, unknown, null, undefined>;
        }> = [];

        data.trainingPoints.forEach((trainingPoint: number[], idx: number) => {
            // Skip the query point itself
            if (trainingPoint[0] === query.queryPoint[0]) {
                return;
            }

            const isNeighbor = neighborSet.has(idx);
            const distance = query.allDistances[idx];

            // Calculate edge points (offset by circle radius in x direction)
            const x1Pos = xScale(query.queryPoint[0]);
            const x2Pos = xScale(trainingPoint[0]);
            const direction = x2Pos > x1Pos ? 1 : -1;

            const x1 = x1Pos + pointRadius * direction;
            const x2 = x2Pos - pointRadius * direction;

            // Create line
            const line = linesGroup
                .append("line")
                .attr(
                    "class",
                    isNeighbor ? "knn-neighbor-line" : "knn-other-line"
                )
                .attr("x1", x1)
                .attr("y1", stripCenter)
                .attr("x2", x2)
                .attr("y2", stripCenter)
                .attr("stroke", isNeighbor ? highlightColor : "#ccc")
                .attr("stroke-width", isNeighbor ? neighborLineWidth : 0.5 * scaleFactor)
                .attr(
                    "opacity",
                    (isNeighbor ? 0.7 : 0.15) * interpolationFactor
                )
                .attr("data-point-index", idx);

            lineData.push({ trainingPoint, idx, isNeighbor, distance, line });
        });

        // Create hover circles over each training point (except query point)
        const hoverGroup = queryGroup
            .append("g")
            .attr("class", "hover-targets");

        lineData.forEach(
            ({ trainingPoint, idx, isNeighbor, distance, line }) => {
                // Get the class label for this point
                const classLabel = data.trainingLabels[idx];

                // Create tooltip content
                const tooltipContent = `
                    <div class="font-semibold text-gray-900 mb-1">Neighbor Point</div>
                    <div class="text-sm text-gray-700">Class: <span class="font-semibold">${classLabel}</span></div>
                    <div class="text-sm text-gray-700">Distance: ${distance.toFixed(4)}</div>
                `;

                // Create invisible larger circle for hover detection
                const hoverCircle = hoverGroup
                    .append("circle")
                    .attr("cx", xScale(trainingPoint[0]))
                    .attr("cy", stripCenter)
                    .attr("r", pointRadius + 3 * scaleFactor) // Slightly larger for easier hover
                    .attr("fill", "transparent")
                    .attr("data-point-index", idx)
                    .style("cursor", "default")
                    .style("pointer-events", "all");

                // Hover behavior - show tooltip
                hoverCircle
                    .on("mousemove", function (event: any) {
                        // Highlight the line
                        line.attr(
                            "stroke-width",
                            isNeighbor ? neighborLineWidth + 1 : 1.5
                        ).attr("opacity", 0.9);

                        // Show HTML tooltip
                        tooltip.html(tooltipContent);
                        tooltip
                            .style("background-color", "white")
                            .style("color", "black")
                            .style("opacity", 0.8)
                            .style("left", event.pageX + 15 + "px")
                            .style("top", event.pageY - 10 + "px");
                    })
                    .on("mouseleave", function () {
                        // Reset line
                        line.attr(
                            "stroke-width",
                            isNeighbor ? neighborLineWidth : 0.5
                        ).attr(
                            "opacity",
                            (isNeighbor ? 0.7 : 0.15) * interpolationFactor
                        );

                        tooltip.style("opacity", 0);
                    });
            }
        );
    }

    // Highlight neighbor points
    query.neighbors.slice(0, k).forEach((neighbor: any) => {
        const trainingPoint = data.trainingPoints[neighbor.index];

        queryGroup
            .append("circle")
            .attr("class", "knn-neighbor-highlight")
            .attr("cx", xScale(trainingPoint[0]))
            .attr("cy", stripCenter)
            .attr("r", 7 * scaleFactor)
            .attr("fill", "none")
            .attr("stroke", highlightColor)
            .attr("stroke-width", 2.5 * scaleFactor)
            .attr("opacity", 0.8 * interpolationFactor);
    });

    // Draw query point
    const queryPointCircle = queryGroup
        .append("circle")
        .attr("class", "knn-query-point")
        .attr("cx", xScale(query.queryPoint[0]))
        .attr("cy", stripCenter)
        .attr("r", queryPointSize)
        .attr("fill", colorScale(query.prediction))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2.5 * scaleFactor)
        .attr("opacity", interpolationFactor);

    // Add query point marker
    queryGroup
        .append("text")
        .attr("class", "knn-query-marker")
        .attr("x", xScale(query.queryPoint[0]))
        .attr("y", stripCenter)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .attr("pointer-events", "none")
        .text("?")
        .attr("opacity", interpolationFactor);

    // Create an invisible larger circle for better hover interaction
    const queryHoverTarget = queryGroup
        .append("circle")
        .attr("class", "knn-query-hover-target")
        .attr("cx", xScale(query.queryPoint[0]))
        .attr("cy", stripCenter)
        .attr("r", queryPointSize + 5)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .style("pointer-events", "all");

    // Ensure the query point and its hover target are on top
    queryPointCircle.raise();
    queryGroup.select(".knn-query-marker").raise();
    queryHoverTarget.raise();

    // Use prediction name or fallback
    const predictionLabel = query.prediction || "Not yet calculated";

    // Add interactive tooltip for query point
    const queryTooltipContent = `
        <div class="font-semibold text-gray-900 mb-1">Prediction: <span class="text-blue-600">${predictionLabel}</span></div>
        <div class="text-xs text-gray-500 mb-2">Nearest Neighbors (k=${k}):</div>
        <div class="space-y-1 max-h-40 overflow-y-auto">
            ${query.neighbors && query.neighbors.length > 0 ? 
                query.neighbors.slice(0, k).map((n: any, i: number) => `
                <div class="flex justify-between items-center text-xs border-b border-gray-100 pb-1">
                    <span class="text-gray-700">#${i + 1} ${n.label}</span>
                    <span class="font-mono text-gray-400">d=${n.distance.toFixed(3)}</span>
                </div>
            `).join("") : '<div class="text-xs text-gray-400 italic">No neighbors available</div>'}
        </div>
    `;

    queryHoverTarget
        .on("mouseover", function (event: any) {
            tooltip.html(queryTooltipContent);
            tooltip
                .style("background-color", "white")
                .style("color", "black")
                .style("opacity", 0.95)
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mousemove", function (event: any) {
            tooltip
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
        });
}

// ============================================================================
// Training Point Tooltips
// ============================================================================

/**
 * Setup HTML tooltip (similar to decision tree)
 */
function setupKNNTooltip(): d3.Selection<
    HTMLDivElement,
    unknown,
    HTMLElement,
    any
> {
    const tooltipId = "knn-point-tooltip";
    const existingTooltip = d3.select(`#${tooltipId}`);

    if (existingTooltip.empty()) {
        return d3
            .select("body")
            .append("div")
            .attr("id", tooltipId)
            .attr(
                "class",
                "absolute bg-gray-800 text-white p-3 rounded-lg shadow-lg pointer-events-none opacity-0 z-50 max-w-xs"
            )
            .style("transition", "opacity 0.3s");
    } else {
        return existingTooltip as unknown as d3.Selection<
            HTMLDivElement,
            unknown,
            HTMLElement,
            any
        >;
    }
}

/**
 * Adds custom hover tooltips to all training points
 */
function addTrainingPointTooltips(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: KNNVisualizationData,
    plotPoints: any[]
) {
    // Setup HTML tooltip
    const tooltip = setupKNNTooltip();

    // Find all data point circles (works for both 2D and 3D)
    const circles = container.selectAll(".data-points circle, .data-points-3d circle");

    circles.each(function (_d: any, i: number) {
        const circle = d3.select(this);
        const point = plotPoints[i];
        const classLabel = data.trainingLabels[point.originalIndex];

        // Prepare tooltip content based on dimensions
        const getTooltipContent = () => {
            let content = `<div class="font-semibold text-gray-900 mb-1">Training Point</div>`;
            content += `<div class="text-sm text-gray-700">Class: <span class="font-semibold">${classLabel}</span></div>`;
            return content;
        };

        // Add hover behavior
        circle
            .style("cursor", "default")
            .on("mouseover.tooltip", function (event: any) {
                tooltip.html(getTooltipContent());

                tooltip
                    .style("background-color", "white")
                    .style("color", "black")
                    .style("opacity", 0.8)
                    .style("left", event.pageX + 15 + "px")
                    .style("top", event.pageY - 10 + "px");
            })
            .on("mousemove.tooltip", function (event: any) {
                tooltip
                    .style("left", event.pageX + 15 + "px")
                    .style("top", event.pageY - 10 + "px");
            })
            .on("mouseout.tooltip", function () {
                tooltip.style("opacity", 0);
            })
            .on("mouseleave.tooltip", function () {
                tooltip.style("opacity", 0);
            });
    });
}

// ============================================================================
// Utility Functions
// ============================================================================

function applyInterpolation(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    currentStep: number,
    context: any
) {
    // Apply fade-in effect based on interpolation
    const factor = calculateInterpolationFactor(currentStep, context);

    container.selectAll(".data-points circle").each(function () {
        const currentOpacity = d3.select(this).attr("opacity");
        const newOpacity = parseFloat(currentOpacity || "0.8") * factor;
        d3.select(this).style("opacity", newOpacity);
    });
}
