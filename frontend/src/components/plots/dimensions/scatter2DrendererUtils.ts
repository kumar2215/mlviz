/**
 * 2D Scatter Plot Renderer
 * Renders 2D scatter plots with decision boundary heatmaps
 */

import {
    createScatterColorScale,
    DEFAULT_MARGIN,
    DEFAULT_POINT_OPACITY,
    DEFAULT_POINT_RADIUS,
    type ScatterRenderOptions,
} from "@/components/plots//utils/scatterRenderHelpers";
import type {
    Config,
    DecisionBoundary,
    PlotPoint,
    Prediction,
} from "@/components/plots/types";
import { renderLegend } from "@/components/plots/utils/legendHelper";
import {
    createColorScale,
    createContinuousColorScale,
} from "@/utils/colorUtils";
import * as d3 from "d3";

// ============================================================================
// Main 2D Render Function
// ============================================================================

export function renderScatter2D(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    plotPoints: PlotPoint[],
    bounds: { min: number[]; max: number[] },
    featureNames: string[],
    config: Config,
    decisionBoundary: DecisionBoundary | undefined,
    options: ScatterRenderOptions,
) {
    console.log("[scatter2D] Rendering with:", {
        plotPointsCount: plotPoints.length,
        bounds,
        hasDecisionBoundary: !!decisionBoundary,
        samplePoint: plotPoints[0],
    });

    const {
        width,
        height,
        margin = DEFAULT_MARGIN,
        pointRadius = DEFAULT_POINT_RADIUS,
        pointOpacity = DEFAULT_POINT_OPACITY,
        showGrid = true,
        showLegend = true,
        showAxes = true,
        useNiceScales = true, // Default to true for backward compatibility
        legendPosition,
        onPointClick,
        onPointHover,
        scaleFactor = 1,
    } = options;

    const scaledPointRadius = pointRadius * scaleFactor;

    // Note: When used with BaseVisualisation, the container is already translated
    // by the margin, so we should use the inner dimensions directly
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    console.log("[scatter2D] Dimensions:", {
        width,
        height,
        margin,
        innerWidth,
        innerHeight,
        note: "Container is already translated by margin in BaseVisualisation",
    });

    // Create scales - use innerWidth/innerHeight as the container is pre-translated
    const xScale = d3
        .scaleLinear()
        .domain([bounds.min[0], bounds.max[0]])
        .range([0, innerWidth]);

    // Only apply .nice() if useNiceScales is true
    if (useNiceScales) {
        xScale.nice();
    }

    const yScale = d3
        .scaleLinear()
        .domain([bounds.min[1], bounds.max[1]])
        .range([innerHeight, 0]);

    // Only apply .nice() if useNiceScales is true
    if (useNiceScales) {
        yScale.nice();
    }

    console.log("[scatter2D] Scale info:", {
        xDomain: xScale.domain(),
        yDomain: yScale.domain(),
        xRange: xScale.range(),
        yRange: yScale.range(),
        firstPointMapped: plotPoints[0]
            ? {
                  original: plotPoints[0].coordinates,
                  x: xScale(plotPoints[0].coordinates[0]),
                  y: yScale(plotPoints[0].coordinates[1]),
              }
            : null,
    });

    // Create color scale
    const colorScale = createScatterColorScale(config);

    // Create separate groups in proper z-order (bottom to top):
    // 1. Grid (bottom layer - behind everything)
    const gridGroup = container.append("g").attr("class", "grid-fixed");
    // 2. Main plot content (decision boundaries, points) - zoomable
    const contentGroup = container.append("g").attr("class", "zoom-content");
    // 3. Axes (top layer - above content with white backgrounds)
    const axesGroup = container.append("g").attr("class", "axes-fixed");
    // 4. Overlay group for components that must be on top
    const overlayGroup = container.append("g").attr("class", "overlay-fixed");

    // Render grid first (bottom layer - fixed, updates with zoom)
    if (showGrid) {
        renderGrid2D(gridGroup, xScale, yScale, innerWidth, innerHeight);
    }

    // Render decision boundary if provided (in content group - zoomable)
    if (decisionBoundary && decisionBoundary.dimensions === 2) {
        renderDecisionBoundary2D(
            contentGroup,
            decisionBoundary,
            xScale,
            yScale,
            config,
        );
    }

    // Render data points (in content group - zoomable)
    renderDataPoints2D(
        contentGroup,
        plotPoints,
        xScale,
        yScale,
        colorScale,
        scaledPointRadius,
        pointOpacity,
        scaleFactor,
        onPointClick,
        onPointHover,
    );

    // Render axes on top (in axes group - fixed, not zoomable, with white backgrounds)
    if (showAxes) {
        renderAxes2D(
            axesGroup,
            xScale,
            yScale,
            featureNames,
            innerWidth,
            innerHeight,
            margin,
            scaleFactor,
        );
    }

    // Render legend (in overlay group - always on top)
    if (showLegend) {
        const legend = renderLegend(overlayGroup, config, innerWidth, innerHeight, { position: legendPosition }, scaleFactor);
        if (legend) {
            legend.onFilterChange((focusedNames) => {
                // Update data points
                const points = contentGroup.select(".data-points").selectAll<SVGCircleElement, PlotPoint>("circle");
                points
                    .transition()
                    .duration(200)
                    .attr("fill", (d) => {
                        if (focusedNames === null) return colorScale(d);
                        const label = d.type === "classification" ? d.label : "";
                        return focusedNames.has(label) ? colorScale(d) : "#d1d5db";
                    })
                    .attr("opacity", (d) => {
                        if (focusedNames === null) return pointOpacity;
                        const label = d.type === "classification" ? d.label : "";
                        return focusedNames.has(label) ? pointOpacity : 0.3;
                    });

                // Update decision boundary regions
                const boundaryRects = contentGroup.select(".decision-boundary").selectAll<SVGRectElement, unknown>("rect");
                if (!boundaryRects.empty()) {
                    const names =
                        config.type === "classification"
                            ? config.classNames
                            : config.type === "clustering"
                              ? config.clusterNames
                              : [];
                    const scheme =
                        config.type === "classification" || config.type === "clustering"
                            ? config.colorScheme || "default"
                            : "default";
                    const categoricalScale = createColorScale(names, scheme);

                    boundaryRects
                        .transition()
                        .duration(200)
                        .attr("fill", function () {
                            const prediction = d3.select(this).attr("data-prediction");
                            if (focusedNames === null) return categoricalScale(prediction);
                            return focusedNames.has(prediction) ? categoricalScale(prediction) : "#e5e7eb";
                        })
                        .attr("opacity", function () {
                            if (focusedNames === null) return 0.3;
                            const prediction = d3.select(this).attr("data-prediction");
                            return focusedNames.has(prediction) ? 0.3 : 0.1;
                        });
                }
            });
        }
    }

    // Return scales, groups, and bounds for zoom handling
    return {
        xScale,
        yScale,
        colorScale,
        contentGroup,
        axesGroup,
        gridGroup,
        bounds: { innerWidth, innerHeight },
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

function renderDecisionBoundary2D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    boundary: DecisionBoundary,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    config: Config,
) {
    const { meshPoints, predictions } = boundary;

    // Create a temporary map to organize mesh points into a grid
    const gridData = new Map<
        string,
        { x: number; y: number; prediction: Prediction }
    >();

    meshPoints.forEach((point: number[], i: number) => {
        const key = `${point[0]},${point[1]}`;
        gridData.set(key, {
            x: point[0],
            y: point[1],
            prediction: predictions[i],
        });
    });

    // Estimate cell size based on mesh resolution
    const xValues = Array.from(
        new Set(meshPoints.map((p: number[]) => p[0])),
    ).sort((a, b) => a - b);
    const yValues = Array.from(
        new Set(meshPoints.map((p: number[]) => p[1])),
    ).sort((a, b) => a - b);

    const cellWidth =
        xValues.length > 1
            ? xScale(xValues[1]) - xScale(xValues[0])
            : xScale.range()[1] / 10;
    const cellHeight =
        yValues.length > 1
            ? Math.abs(yScale(yValues[1]) - yScale(yValues[0]))
            : yScale.range()[0] / 10;

    // Render heatmap cells
    const boundaryGroup = g.append("g").attr("class", "decision-boundary");

    Array.from(gridData.values()).forEach((cell) => {
        let fillColor: string;

        if (
            boundary.type === "classification" ||
            boundary.type === "clustering"
        ) {
            const names =
                config.type === "classification"
                    ? config.classNames
                    : config.type === "clustering"
                      ? config.clusterNames
                      : [];
            const scheme =
                config.type === "classification" || config.type === "clustering"
                    ? config.colorScheme || "default"
                    : "default";
            const categoricalScale = createColorScale(names, scheme);
            fillColor = categoricalScale(cell.prediction as string);
        } else {
            const valueRange =
                config.type === "regression"
                    ? config.valueRange || [
                          Math.min(...config.values),
                          Math.max(...config.values),
                      ]
                    : ([0, 1] as [number, number]);
            const continuousScale = createContinuousColorScale(
                valueRange,
                config.type === "regression"
                    ? config.colorScheme || "viridis"
                    : "viridis",
            );
            fillColor = continuousScale(cell.prediction as number);
        }

        boundaryGroup
            .append("rect")
            .attr("x", xScale(cell.x) - cellWidth / 2)
            .attr("y", yScale(cell.y) - cellHeight / 2)
            .attr("width", cellWidth)
            .attr("height", cellHeight)
            .attr("fill", fillColor)
            .attr("opacity", 0.3)
            .attr("data-prediction", String(cell.prediction));
    });
}

function renderGrid2D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    width: number,
    height: number,
) {
    const gridGroup = g.append("g").attr("class", "grid");

    // Store grid dimensions for zoom rescaling
    (gridGroup.node() as any).__gridDimensions__ = { width, height };

    // X-axis grid
    gridGroup
        .append("g")
        .attr("class", "grid-x")
        .attr("transform", `translate(0,${height})`)
        .call(
            d3
                .axisBottom(xScale)
                .tickSize(-height)
                .tickFormat(() => ""),
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .attr("stroke", "#e5e7eb")
                .attr("stroke-opacity", 0.7),
        );

    // Y-axis grid
    gridGroup
        .append("g")
        .attr("class", "grid-y")
        .call(
            d3
                .axisLeft(yScale)
                .tickSize(-width)
                .tickFormat(() => ""),
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .attr("stroke", "#e5e7eb")
                .attr("stroke-opacity", 0.7),
        );
}

function renderAxes2D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    featureNames: string[],
    width: number,
    height: number,
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    } = DEFAULT_MARGIN,
    scaleFactor: number = 1,
) {
    // Calculate background coverage based on actual margins
    const leftCoverage = (margin.left + 10) * scaleFactor; // Left margin + padding
    const bottomCoverage = (margin.bottom + 20) * scaleFactor; // Bottom margin + padding for labels
    const topCoverage = (margin.top + 10) * scaleFactor; // Top margin + padding
    const rightCoverage = (margin.right + 10) * scaleFactor; // Right margin + padding

    // Add white background for X-axis (bottom, extended to cover corners)
    g.append("rect")
        .attr("class", "x-axis-background")
        .attr("x", -leftCoverage)
        .attr("y", height - 1)
        .attr("width", width + leftCoverage + rightCoverage)
        .attr("height", bottomCoverage)
        .attr("fill", "white")
        .attr("opacity", 1);

    // Add white background for Y-axis (left)
    g.append("rect")
        .attr("class", "y-axis-background")
        .attr("x", -leftCoverage)
        .attr("y", -10)
        .attr("width", leftCoverage)
        .attr("height", height + 20)
        .attr("fill", "white")
        .attr("opacity", 1);

    // Add white background for top edge (extended to cover corners)
    g.append("rect")
        .attr("class", "top-edge-background")
        .attr("x", -leftCoverage)
        .attr("y", -topCoverage)
        .attr("width", width + leftCoverage + rightCoverage)
        .attr("height", topCoverage)
        .attr("fill", "white")
        .attr("opacity", 1);

    // Add white background for right edge
    g.append("rect")
        .attr("class", "right-edge-background")
        .attr("x", width)
        .attr("y", -10)
        .attr("width", rightCoverage)
        .attr("height", height + 20)
        .attr("fill", "white")
        .attr("opacity", 1);

    // X-axis
    const xAxis = g
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    // Store original scale on the axis element for zoom rescaling
    (xAxis.node() as any).__xScale__ = xScale.copy();

    xAxis
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40 * scaleFactor)
        .attr("fill", "#374151")
        .attr("font-size", `${12 * scaleFactor}px`)
        .attr("font-weight", "500")
        .attr("text-anchor", "middle")
        .text(featureNames[0] || "X");

    // Y-axis
    const yAxis = g
        .append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));

    // Store original scale on the axis element for zoom rescaling
    (yAxis.node() as any).__yScale__ = yScale.copy();

    yAxis
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45 * scaleFactor)
        .attr("fill", "#374151")
        .attr("font-size", `${12 * scaleFactor}px`)
        .attr("font-weight", "500")
        .attr("text-anchor", "middle")
        .text(featureNames[1] || "Y");

    // Style axis lines and ticks
    g.selectAll(".x-axis path, .y-axis path")
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 1 * scaleFactor);

    g.selectAll(".x-axis line, .y-axis line")
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 1 * scaleFactor);

    g.selectAll(".x-axis text, .y-axis text")
        .attr("fill", "#6b7280")
        .attr("font-size", `${10 * scaleFactor}px`);
}

function renderDataPoints2D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    plotPoints: PlotPoint[],
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    colorScale: (point: PlotPoint) => string,
    pointRadius: number,
    opacity: number,
    scaleFactor: number = 1,
    onPointClick?: (index: number, point: number[]) => void,
    onPointHover?: (index: number | null) => void,
) {
    console.log(
        "[renderDataPoints2D] Creating points group with",
        plotPoints.length,
        "points",
    );

    const pointsGroup = g
        .append("g")
        .attr("class", "data-points")
        .style("pointer-events", "all");
    const circles = pointsGroup
        .selectAll("circle")
        .data(plotPoints)
        .enter()
        .append("circle")
        .attr("cx", (d) => {
            const x = xScale(d.coordinates[0]);
            if (isNaN(x)) console.warn("[2D] Invalid x coordinate:", d);
            return x;
        })
        .attr("cy", (d) => {
            const y = yScale(d.coordinates[1]);
            if (isNaN(y)) console.warn("[2D] Invalid y coordinate:", d);
            return y;
        })
        .attr("r", pointRadius)
        .attr("fill", (d) => colorScale(d))
        .attr("opacity", opacity)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5 * scaleFactor)
        .attr("cursor", onPointClick ? "pointer" : "default")
        .raise();

    // Add interactions
    if (onPointClick) {
        circles.on("click", (event, d) => {
            event.stopPropagation();
            onPointClick(d.originalIndex, d.coordinates);
        });
    }

    if (onPointHover) {
        circles
            .on("mouseenter", (event, d) => {
                onPointHover(d.originalIndex);
                d3.select(event.currentTarget)
                    .transition()
                    .duration(150)
                    .attr("r", pointRadius * 1.5)
                    .attr("stroke-width", 2.5 * scaleFactor);
            })
            .on("mouseleave", (event) => {
                onPointHover(null);
                d3.select(event.currentTarget)
                    .transition()
                    .duration(150)
                    .attr("r", pointRadius)
                    .attr("stroke-width", 1.5 * scaleFactor);
            });
    }

    // Add tooltips
    circles.append("title").text((d) => {
        if (d.type === "classification") {
            return `${d.label}\n(${d.coordinates[0].toFixed(
                2,
            )}, ${d.coordinates[1].toFixed(2)})`;
        } else {
            return `Value: ${d.value.toFixed(3)}\n(${d.coordinates[0].toFixed(
                2,
            )}, ${d.coordinates[1].toFixed(2)})`;
        }
    });
}

