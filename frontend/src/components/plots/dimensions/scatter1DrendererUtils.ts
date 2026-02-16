/**
 * 1D Scatter Plot Renderer
 * Renders strip plots with jittered points and optional decision boundaries
 */

import {
    createBoundaryColorScale,
    createScatterColorScale,
    type ScatterRenderOptions,
    STRIP_HEIGHT_RATIO,
} from "@/components/plots//utils/scatterRenderHelpers";
import type {
    Config,
    DecisionBoundary,
    PlotPoint,
} from "@/components/plots/types";
import { renderLegend } from "@/components/plots/utils/legendHelper";
import * as d3 from "d3";

// ============================================================================
// Main 1D Render Function
// ============================================================================

export function renderScatter1D(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    plotPoints: PlotPoint[],
    bounds: { min: number[]; max: number[] },
    featureNames: string[],
    config: Config,
    decisionBoundary: DecisionBoundary | undefined,
    options: ScatterRenderOptions
) {
    console.log("[scatter1D] Rendering with:", {
        plotPointsCount: plotPoints.length,
        bounds,
        hasDecisionBoundary: !!decisionBoundary,
        samplePoint: plotPoints[0],
    });

    const {
        width,
        height,
        margin = { top: 40, right: 20, bottom: 50, left: 60 },
        pointRadius = 6,
        pointOpacity = 0.7,
        showGrid = true,
        showLegend = true,
        showAxes = true,
        legendPosition,
        onPointClick,
        onPointHover,
        scaleFactor = 1,
    } = options;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create x scale for the 1D feature
    const xScale = d3
        .scaleLinear()
        .domain([bounds.min[0], bounds.max[0]])
        .range([0, innerWidth])
        .nice();

    // Calculate strip center and height
    const stripCenter = innerHeight / 2;
    const stripHeight = innerHeight * STRIP_HEIGHT_RATIO;

    // Create color scale
    const colorScale = createScatterColorScale(config);

    // Render decision boundary if provided
    if (decisionBoundary && decisionBoundary.dimensions === 1) {
        renderDecisionBoundary1D(
            container,
            decisionBoundary,
            xScale,
            config,
            stripCenter,
            stripHeight
        );
    }

    // Render background strip
    container
        .append("rect")
        .attr("x", 0)
        .attr("y", stripCenter - stripHeight / 2)
        .attr("width", innerWidth)
        .attr("height", stripHeight)
        .attr("fill", "#f9fafb")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1 * scaleFactor)
        .attr("rx", 4 * scaleFactor);

    // Render grid
    if (showGrid) {
        renderGrid1D(container, xScale, stripCenter, stripHeight);
    }

    // Render axes
    if (showAxes) {
        renderAxes1D(
            container,
            xScale,
            featureNames,
            stripCenter,
            stripHeight,
            innerWidth,
            scaleFactor
        );
    }

    // Render data points with jitter
    renderDataPoints1D(
        container,
        plotPoints,
        xScale,
        colorScale,
        stripCenter,
        stripHeight,
        pointRadius * scaleFactor,
        pointOpacity,
        scaleFactor,
        onPointClick,
        onPointHover
    );

    // Render legend
    if (showLegend) {
        const legend = renderLegend(container, config, innerWidth, innerHeight, { position: legendPosition }, scaleFactor);
        if (legend) {
            legend.onFilterChange((focusedNames) => {
                // Update data points
                const points = container.select(".data-points").selectAll<SVGCircleElement, PlotPoint>("circle");
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
                const boundaryRects = container.select(".decision-boundary").selectAll<SVGRectElement, unknown>("rect");
                if (!boundaryRects.empty()) {
                    const getColor = createBoundaryColorScale(config);

                    boundaryRects
                        .transition()
                        .duration(200)
                        .attr("fill", function () {
                            const prediction = d3.select(this).attr("data-prediction");
                            if (focusedNames === null) return getColor(prediction);
                            return focusedNames.has(prediction) ? getColor(prediction) : "#e5e7eb";
                        });
                }
            });
        }
    }

    return { 
        xScale, 
        colorScale, 
        contentGroup: container, 
        bounds: { innerWidth, innerHeight } 
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

function renderDecisionBoundary1D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    boundary: DecisionBoundary,
    xScale: d3.ScaleLinear<number, number>,
    config: Config,
    stripCenter: number,
    stripHeight: number
) {
    const { meshPoints, predictions } = boundary;

    // Sort mesh points by x coordinate
    const sortedData = meshPoints
        .map((point: number[], i: number) => ({
            x: point[0],
            prediction: predictions[i],
        }))
        .sort((a, b) => a.x - b.x);

    const boundaryGroup = g
        .append("g")
        .attr("class", "decision-boundary")
        .attr("opacity", 0.2);

    // Create color scale
    const getColor = createBoundaryColorScale(config);

    // Render regions
    for (let i = 0; i < sortedData.length - 1; i++) {
        const current = sortedData[i];
        const next = sortedData[i + 1];

        const x1 = xScale(current.x);
        const x2 = xScale(next.x);

        boundaryGroup
            .append("rect")
            .attr("x", x1)
            .attr("y", stripCenter - stripHeight / 2)
            .attr("width", x2 - x1)
            .attr("height", stripHeight)
            .attr("fill", getColor(current.prediction))
            .attr("data-prediction", String(current.prediction));
    }
}

function renderGrid1D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    stripCenter: number,
    stripHeight: number
) {
    const gridGroup = g.append("g").attr("class", "grid");

    gridGroup
        .append("g")
        .attr("class", "grid-x")
        .attr("transform", `translate(0,${stripCenter + stripHeight / 2})`)
        .call(
            d3
                .axisBottom(xScale)
                .tickSize(-(stripHeight + 20))
                .tickFormat(() => "")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .attr("stroke", "#d1d5db")
                .attr("stroke-opacity", 0.5)
        );
}

function renderAxes1D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    featureNames: string[],
    stripCenter: number,
    stripHeight: number,
    width: number,
    scaleFactor: number = 1
) {
    // X-axis
    const xAxis = g
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${stripCenter + stripHeight / 2 + 10})`)
        .call(d3.axisBottom(xScale));

    xAxis
        .append("text")
        .attr("x", width / 2)
        .attr("y", 35 * scaleFactor)
        .attr("fill", "#374151")
        .attr("font-size", `${12 * scaleFactor}px`)
        .attr("font-weight", "500")
        .attr("text-anchor", "middle")
        .text(featureNames[0] || "Feature");

    // Style axis
    g.selectAll(".x-axis path")
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 1 * scaleFactor);

    g.selectAll(".x-axis line")
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 1 * scaleFactor);

    g.selectAll(".x-axis text")
        .attr("fill", "#6b7280")
        .attr("font-size", `${10 * scaleFactor}px`);
}

function renderDataPoints1D(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    plotPoints: PlotPoint[],
    xScale: d3.ScaleLinear<number, number>,
    colorScale: (point: PlotPoint) => string,
    stripCenter: number,
    stripHeight: number,
    pointRadius: number,
    opacity: number,
    scaleFactor: number = 1,
    onPointClick?: (index: number, point: number[]) => void,
    onPointHover?: (index: number | null) => void
) {
    console.log("[renderDataPoints1D] Creating points group with", plotPoints.length, "points");

    const pointsGroup = g
        .append("g")
        .attr("class", "data-points")
        .style("pointer-events", "all");

    // Use deterministic bee swarm layout to prevent overlapping points
    // Sort points by x position for deterministic placement
    const sortedPoints = [...plotPoints].sort((a, b) => a.coordinates[0] - b.coordinates[0]);

    // Track occupied positions to avoid overlaps
    const occupiedPositions: Array<{ x: number; y: number }> = [];
    const minSpacing = pointRadius * 2.2; // Minimum distance between circle centers

    const circles = pointsGroup
        .selectAll("circle")
        .data(sortedPoints)
        .enter()
        .append("circle")
        .attr("cx", (d) => {
            const x = xScale(d.coordinates[0]);
            if (isNaN(x)) console.warn("[1D] Invalid x coordinate:", d);
            return x;
        })
        .attr("cy", (d) => {
            // Calculate deterministic y position using bee swarm algorithm
            const x = xScale(d.coordinates[0]);
            let y = stripCenter;
            let offset = 0;
            let direction = 1; // Alternate above/below center

            // Find a position that doesn't overlap with existing points
            let attempts = 0;
            const maxAttempts = 50;

            while (attempts < maxAttempts) {
                let overlaps = false;

                // Check if this position overlaps with any existing points
                for (const pos of occupiedPositions) {
                    const dx = x - pos.x;
                    const dy = y - pos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < minSpacing) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    // Found a good position
                    occupiedPositions.push({ x, y });
                    break;
                }

                // Try next position - alternate above and below
                offset += pointRadius * 1.1;
                direction *= -1;
                y = stripCenter + (offset * direction);

                // Constrain to strip bounds
                const maxOffset = stripHeight / 2 - pointRadius;
                if (Math.abs(y - stripCenter) > maxOffset) {
                    y = stripCenter + (maxOffset * Math.sign(y - stripCenter));
                }

                attempts++;
            }

            return y;
        })
        .attr("r", pointRadius)
        .attr("fill", (d) => colorScale(d))
        .attr("opacity", opacity)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5 * scaleFactor)
        .attr("cursor", onPointClick ? "pointer" : "default")
        .raise();

    console.log("[renderDataPoints1D] Created", circles.size(), "circle elements");

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
            return `${d.label}\nValue: ${d.coordinates[0].toFixed(2)}`;
        } else {
            return `Target: ${d.value.toFixed(
                3
            )}\nValue: ${d.coordinates[0].toFixed(2)}`;
        }
    });
}

