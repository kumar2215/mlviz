import {
    prepareHistogramData,
    renderHistogramBars,
} from "@/components/charts/histogramUtils";
import type { ClassDistribution } from "@/components/decision_tree/classifier/types";
import { applyFont } from "@/components/visualisation/config/fonts";
import type { HistogramData } from "@/types/model";
import * as d3 from "d3";


export interface TransformedNode {
    name: string;
    type: "leaf" | "split";
    samples: number;
    impurity: number;
    feature?: string;
    threshold?: number;
    value?: number[][];
    histogram_data?: HistogramData | null;
    depth: number;
    children: TransformedNode[];
    isOnPath?: boolean;
    isCurrentNode?: boolean;
    terminal?: boolean; // Flag to mark a leaf as terminal (not splittable)
}

export const getClassDistribution = (
    d: d3.HierarchyNode<TransformedNode>,
    classNames?: string[]
): ClassDistribution[] => {
    if (!d.data.value || !d.data.value[0]) {
        return [];
    }

    const values = d.data.value[0];
    const total = values.reduce((sum: number, val: number) => sum + val, 0);

    const result = values
        .map((count: number, index: number) => ({
            class: classNames?.[index] || `Class ${index}`,
            count: count * d.data.samples, // Raw sample count
            value: total > 0 ? count / total : 0, // Proportion (0-1) for width calculations
            percentage: total > 0 ? (count / total) * 100 : 0, // Actual percentage for display
        }))
        .filter((item: ClassDistribution) => item.count > 0) // Only show classes that exist
        .sort(
            (a: ClassDistribution, b: ClassDistribution) => b.count - a.count
        ); // Sort by count descending
    console.log('[getClassDistribution] Called with d:', d, 'classNames:', classNames);
    console.log('[getClassDistribution] Result:', result);
    return result;
};

export const renderIntegratedSplitNode = (
    nodeGroup: d3.Selection<
        SVGGElement,
        d3.HierarchyNode<TransformedNode>,
        null,
        undefined
    >,
    d: d3.HierarchyNode<TransformedNode>,
    distribution: ClassDistribution[],
    totalWidth: number,
    colorScale?: ((className: string) => string) | d3.ScaleOrdinal<string, string>,
    interpolationFactor?: number,
    classNames?: string[],
    scaleFactor: number = 1
) => {
    const histogramHeight = 40 * scaleFactor;
    const textHeight = 30 * scaleFactor;
    const barHeight = 8 * scaleFactor;
    const totalHeight = histogramHeight + textHeight + barHeight;

    nodeGroup
        .append("rect")
        .attr("width", totalWidth + 15 * scaleFactor)
        .attr("height", totalHeight + 10 * scaleFactor)
        .attr("x", -totalWidth / 2 - 6 * scaleFactor)
        .attr("y", -totalHeight / 2)
        .attr("rx", 6 * scaleFactor)
        .attr("fill", "#ecececff")
        .attr("fill-opacity", d.data.isOnPath ? interpolationFactor || 0 : 0)
        .attr("stroke", d.data.isOnPath ? "#333" : "none")
        .attr(
            "stroke-width",
            d.data.isOnPath ? (interpolationFactor || 0) * 2 * scaleFactor : 0
        );

    if (d.data.histogram_data) {
        renderHistogramComponent(
            nodeGroup,
            d.data.histogram_data,
            totalWidth - 10 * scaleFactor,
            histogramHeight - 5 * scaleFactor,
            -totalWidth / 2 + 5 * scaleFactor,
            -totalHeight / 2 + 5 * scaleFactor,
            colorScale,
            classNames
        );
    }

    nodeGroup
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", -totalHeight / 2 + histogramHeight + 20 * scaleFactor)
        .call(applyFont.family)
        .attr("font-size", `${10 * scaleFactor}px`)
        .call(applyFont.weight.bold)
        .attr("fill", "#374151")
        .text(d.data.feature || d.data.name);

    renderDistributionBar(
        nodeGroup,
        distribution,
        totalWidth - 10 * scaleFactor,
        barHeight,
        -totalHeight / 2 + histogramHeight + textHeight,
        colorScale,
        scaleFactor
    );
};

export const renderLeafNode = (
    nodeGroup: d3.Selection<
        SVGGElement,
        d3.HierarchyNode<TransformedNode>,
        null,
        undefined
    >,
    d: d3.HierarchyNode<TransformedNode>,
    distribution: ClassDistribution[],
    totalWidth: number,
    colorScale?: ((className: string) => string) | d3.ScaleOrdinal<string, string>,
    interpolationFactor?: number,
    scaleFactor: number = 1
) => {
    const leafHeight = 40 * scaleFactor;

    console.log('[renderLeafNode] Called with distribution:', distribution, 'totalWidth:', totalWidth);
    console.log('[renderLeafNode] Node data:', d.data);

    if (distribution.length === 0) return;

    if (distribution.length === 1) {
        const classInfo = distribution[0];

        // Add animated background highlight for path nodes
        if (d.data.isOnPath && interpolationFactor && interpolationFactor > 0) {
            nodeGroup
                .append("rect")
                .attr("width", totalWidth + 8 * scaleFactor)
                .attr("height", leafHeight + 8 * scaleFactor)
                .attr("x", -totalWidth / 2 - 4 * scaleFactor)
                .attr("y", -leafHeight / 2 - 4 * scaleFactor)
                .attr("rx", 8 * scaleFactor)
                .attr("fill", "#333")
                .attr("fill-opacity", interpolationFactor * 0.3)
                .attr("stroke", "#333")
                .attr("stroke-width", interpolationFactor * 2 * scaleFactor);
        }

        nodeGroup
            .append("rect")
            .attr("width", totalWidth)
            .attr("height", leafHeight)
            .attr("x", -totalWidth / 2)
            .attr("y", -leafHeight / 2)
            .attr("rx", 6 * scaleFactor)
            .attr("fill", colorScale ? colorScale(classInfo.class) : "#3b82f6");

        nodeGroup
            .append("text")
            .attr("y", -3 * scaleFactor)
            .attr("text-anchor", "middle")
            .call(applyFont.family)
            .attr("font-size", `${10 * scaleFactor}px`)
            .call(applyFont.weight.bold)
            .attr("fill", "#eeeeee")
            .text(classInfo.class.substring(0, 3));

        nodeGroup
            .append("text")
            .attr("y", 10 * scaleFactor)
            .attr("text-anchor", "middle")
            .call(applyFont.family)
            .attr("font-size", `${8 * scaleFactor}px`)
            .attr("fill", "white")
            .text(`n=${classInfo.count}`);
    } else {
        // Add animated background highlight for multi-class path leaf nodes
        if (d.data.isOnPath && interpolationFactor && interpolationFactor > 0) {
            nodeGroup
                .append("rect")
                .attr("width", totalWidth + 8 * scaleFactor)
                .attr("height", leafHeight + 8 * scaleFactor)
                .attr("x", -totalWidth / 2 - 4 * scaleFactor)
                .attr("y", -leafHeight / 2 - 4 * scaleFactor)
                .attr("rx", 8 * scaleFactor)
                .attr("fill", "#333")
                .attr("fill-opacity", interpolationFactor * 0.3)
                .attr("stroke", "#333")
                .attr("stroke-width", interpolationFactor * 2 * scaleFactor);
        }

        let currentX = -totalWidth / 2;

        distribution.forEach((classInfo: ClassDistribution, index: number) => {
            const proportionalWidth = Math.max(
                10 * scaleFactor,
                classInfo.value * totalWidth
            );
            const cornerRadius = 5 * scaleFactor;

            nodeGroup
                .append("path")
                .attr("d", function (_d) {
                    const width = proportionalWidth;
                    const height = leafHeight;
                    const x = currentX;
                    const y = -leafHeight / 2;

                    if (index === 0) {
                        return `M${x + cornerRadius},${y}
                                L${x + width},${y}
                                L${x + width},${y + height}
                                L${x + cornerRadius},${y + height}
                                A${cornerRadius},${cornerRadius} 0 0,1 ${x},${
                            y + height - cornerRadius
                        }
                                L${x},${y + cornerRadius}
                                A${cornerRadius},${cornerRadius} 0 0,1 ${
                            x + cornerRadius
                        },${y} Z`;
                    } else if (index === distribution.length - 1) {
                        return `M${x},${y}
                                L${x + width - cornerRadius},${y}
                                A${cornerRadius},${cornerRadius} 0 0,1 ${
                            x + width
                        },${y + cornerRadius}
                                L${x + width},${y + height - cornerRadius}
                                A${cornerRadius},${cornerRadius} 0 0,1 ${
                            x + width - cornerRadius
                        },${y + height}
                                L${x},${y + height} Z`;
                    } else {
                        return `M${x},${y}
                        L${x + width},${y}
                        L${x + width},${y + height}
                        L${x},${y + height} Z`;
                    }
                })
                .attr(
                    "fill",
                    colorScale
                        ? colorScale(classInfo.class)
                        : `hsl(${(index * 137.5) % 360}, 50%, 50%)`
                );

            if (proportionalWidth > 20 * scaleFactor) {
                nodeGroup
                    .append("text")
                    .attr("x", currentX + proportionalWidth / 2)
                    .attr("y", -3 * scaleFactor)
                    .attr("text-anchor", "middle")
                    .call(applyFont.family)
                    .attr("font-size", `${10 * scaleFactor}px`)
                    .call(applyFont.weight.bold)
                    .attr("fill", "white")
                    .text(classInfo.class.substring(0, 3));
                nodeGroup
                    .append("text")
                    .attr("x", currentX + proportionalWidth / 2)
                    .attr("y", 10 * scaleFactor)
                    .attr("text-anchor", "middle")
                    .call(applyFont.family)
                    .attr("font-size", `${8 * scaleFactor}px`)
                    .attr("fill", "white")
                    .text(`n=${classInfo.count}`);
            }

            currentX += proportionalWidth;
        });
    }
};

const renderHistogramComponent = (
    nodeGroup: d3.Selection<SVGGElement, any, null, undefined>,
    histogramData: HistogramData,
    width: number,
    height: number,
    xOffset: number,
    yOffset: number,
    colorScale?: ((className: string) => string) | d3.ScaleOrdinal<string, string>,
    classNames?: string[]
) => {
    if (!histogramData.bins || histogramData.bins.length < 2) return;

    const histogramGroup = nodeGroup
        .append("g")
        .attr("class", "histogram-group")
        .attr("transform", `translate(${xOffset}, ${yOffset})`);

    const stackedData = prepareHistogramData(histogramData);

    // Debug logging for color scheme issues
    const keys = Object.keys(histogramData.counts_by_class);
    // Sort keys to match renderHistogramBars logic
    const sortedKeys = [...keys].sort(); 
    
    console.log('[renderHistogramComponent] Keys:', keys);
    console.log('[renderHistogramComponent] Sorted Keys:', sortedKeys);
    console.log('[renderHistogramComponent] Class names:', classNames);
    
    console.log('[renderHistogramComponent] colorScale type:', colorScale ? (typeof colorScale === 'function' ? 'function' : 'ordinal') : 'undefined');
    console.log('[renderHistogramComponent] colorScale provided:', !!colorScale, '| classNames provided:', !!classNames);

    const colorScheme = colorScale && classNames
        ? sortedKeys.map((classIndex) => {
              // Convert class index (e.g., "0") to class name (e.g., "setosa")
              const className = classNames[parseInt(classIndex)];
              const color = colorScale(className);
              console.log(`[renderHistogramComponent] Mapping class index "${classIndex}" -> name "${className}" -> color: "${color}"`);
              return color;
          })
        : undefined;

    console.log('[renderHistogramComponent] Final colorScheme for histogram bars:', colorScheme);

    renderHistogramBars(histogramGroup, histogramData, stackedData, {
        width,
        height,
        colorScheme,
        showThreshold: true,
        showAxes: false, // No axes in the compact node version
        showLegend: false, // No legend in the compact node version
    });
};

const renderDistributionBar = (
    nodeGroup: d3.Selection<SVGGElement, any, null, undefined>,
    distribution: ClassDistribution[],
    width: number,
    height: number,
    yOffset: number,
    colorScale?: ((className: string) => string) | d3.ScaleOrdinal<string, string>,
    scaleFactor: number = 1
) => {
    console.log('[renderDistributionBar] colorScale provided:', !!colorScale);
    distribution.forEach((classInfo) => {
        const color = colorScale ? colorScale(classInfo.class) : 'fallback-hsl';
        console.log(`[renderDistributionBar] class "${classInfo.class}" -> color: "${color}"`);
    });
    let currentX = -width / 2;

    distribution.forEach((classInfo, index) => {
        const segmentWidth = Math.max(1 * scaleFactor, classInfo.value * width);

        if (segmentWidth > 0) {
            const cornerRadius = 4 * scaleFactor;
            nodeGroup
                .append("path")
                .attr("x", currentX)
                .attr("y", yOffset)
                .attr("width", segmentWidth)
                .attr("height", height)
                .attr("d", function (_d) {
                    const x = currentX;
                    const y = yOffset;

                    if (index === 0) {
                        return `M${x + cornerRadius},${y}
                        L${x + segmentWidth},${y}
                        L${x + segmentWidth},${y + height}
                        L${x + cornerRadius},${y + height}
                        A${cornerRadius},${cornerRadius} 0 0,1 ${x},${
                            y + height - cornerRadius
                        }
                        L${x},${y + cornerRadius}
                        A${cornerRadius},${cornerRadius} 0 0,1 ${
                            x + cornerRadius
                        },${y} Z`;
                    } else if (index === distribution.length - 1) {
                        return `M${x},${y}
                        L${x + segmentWidth - cornerRadius},${y}
                        A${cornerRadius},${cornerRadius} 0 0,1 ${
                            x + segmentWidth
                        },${y + cornerRadius}
                        L${x + segmentWidth},${y + height - cornerRadius}
                        A${cornerRadius},${cornerRadius} 0 0,1 ${
                            x + segmentWidth - cornerRadius
                        },${y + height}
                        L${x},${y + height} Z`;
                    } else {
                        return `M${x},${y}
                        L${x + segmentWidth},${y}
                        L${x + segmentWidth},${y + height}
                        L${x},${y + height} Z`;
                    }
                })
                .attr(
                    "fill",
                    colorScale
                        ? colorScale(classInfo.class)
                        : `hsl(${(index * 137.5) % 360}, 50%, 50%)`
                )
                .attr("opacity", 0.7);

            currentX += segmentWidth;
        }
    });
};

export const getDefaultTooltipContent = (
    d: d3.HierarchyNode<TransformedNode>
): string => {
    let content = `<div class="font-semibold text-base mb-2">${
        d.data.type === "leaf" ? "Leaf Node" : "Decision Node"
    }</div>`;
    content += `<div class="text-sm">Samples: ${d.data.samples}</div>`;
    content += `<div class="text-sm">Impurity: ${d.data.impurity.toFixed(
        4
    )}</div>`;

    if (d.data.type === "split") {
        content += `<div class="text-sm">Feature: ${d.data.feature}</div>`;
        content += `<div class="text-sm">Threshold: ${d.data.threshold?.toFixed(
            3
        )}</div>`;
    }

    return content;
};

export const setupTooltip = (): d3.Selection<
    HTMLDivElement,
    unknown,
    HTMLElement,
    any
> => {
    const tooltipId = "decision-tree-tooltip";
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
        existingTooltip.style("opacity", 0);
        return existingTooltip as unknown as d3.Selection<
            HTMLDivElement,
            unknown,
            HTMLElement,
            any
        >;
    }
};

export const addNodeInteractions = (
    node: d3.Selection<
        d3.BaseType,
        d3.HierarchyNode<TransformedNode>,
        SVGGElement,
        unknown
    >,
    tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>,
    getTooltipContent?: (d: any) => string
) => {
    node.style("cursor", "pointer")
        .on(
            "mouseover",
            function (event, d: d3.HierarchyNode<TransformedNode>) {
                const tooltipContent = getTooltipContent
                    ? getTooltipContent(d)
                    : getDefaultTooltipContent(d);

                tooltip.html(tooltipContent);

                tooltip
                    .style("background-color", "white")
                    .style("color", "black")
                    .style("opacity", 0.8)
                    .style("left", event.pageX + 15 + "px")
                    .style("top", event.pageY - 10 + "px");
            }
        )
        .on("mousemove", function (event) {
            tooltip
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
        })
        .on("mouseleave", function () {
            tooltip.style("opacity", 0);
        });
};

// Manual tree building rendering functions

export const renderExpandableLeafNode = (
    nodeGroup: d3.Selection<SVGGElement, any, null, undefined>,
    d: any,
    distribution: ClassDistribution[],
    nodeWidth: number,
    colorScale: ((className: string) => string) | d3.ScaleOrdinal<string, string, never>,
    isSelected: boolean,
    scaleFactor: number = 1
): void => {
    const nodeHeight = 40 * scaleFactor;

    // Check if this is a terminal leaf (marked as not splittable)
    const isTerminal = d.data?.terminal === true;
    console.log('[renderExpandableLeafNode] Node:', d.data, 'isTerminal:', isTerminal);
    console.log('[renderExpandableLeafNode] colorScale type:', typeof colorScale);
    distribution.forEach((classInfo) => {
        const color = colorScale(classInfo.class);
        console.log(`[renderExpandableLeafNode] class "${classInfo.class}" -> color: "${color}"`);
    });

    // If terminal, render as a regular leaf node without + icon
    if (isTerminal) {
        console.log('[renderExpandableLeafNode] Rendering as terminal leaf');
        console.log(distribution, nodeWidth)
        renderLeafNode(nodeGroup,
            d,
            distribution,
            nodeWidth,
            colorScale,
            undefined,
            scaleFactor);
        return;
    }

    // Background with selection highlight
    nodeGroup
        .append("rect")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("x", -nodeWidth / 2)
        .attr("y", -nodeHeight / 2)
        .attr("rx", 6 * scaleFactor)
        .attr("fill", isSelected ? "#e0e7ff" : "#f3f4f6")
        .attr("stroke", isSelected ? "#4f46e5" : "#d1d5db")
        .attr("stroke-width", isSelected ? 2 * scaleFactor : 1 * scaleFactor);

    // Display class distribution
    // Reusing renderDistributionBar ensures consistent visualization and correct color mapping
    // (using class name instead of potentially incorrect loop index)
    const barWidth = nodeWidth - 20 * scaleFactor;
    const barHeight = 8 * scaleFactor;
    const barY = -nodeHeight / 4;

    // Add a group positioned at the start of the bar area
    const barGroup = nodeGroup.append("g");

    // renderDistributionBar expects to draw centered on 0, so we pass the correct yOffset
    // AND we must not translate the group if we want it to align with how renderDistributionBar works
    // (which draws from -width/2 to +width/2)

    renderDistributionBar(
        barGroup,
        distribution,
        barWidth,
        barHeight,
        barY,
        colorScale,
        scaleFactor
    );

    // Show "+" icon or "Selected" text
    if (isSelected) {
        nodeGroup
            .append("text")
            .attr("y", nodeHeight / 4 + 5 * scaleFactor)
            .attr("text-anchor", "middle")
            .attr("font-size", `${12 * scaleFactor}px`)
            .attr("fill", "#4f46e5")
            .attr("font-weight", "bold")
            .text("Selected");
    } else {
        nodeGroup
            .append("text")
            .attr("y", nodeHeight / 2 - 5 * scaleFactor)
            .attr("text-anchor", "middle")
            .attr("font-size", `${10 * scaleFactor}px`)
            .attr("fill", "#6b7280")
            .text(`n=${d.data.samples}`);
    }

};

/**
 * Render information gain line graph that progressively reveals as threshold changes
 */
export const renderInformationGainGraph = (
    svgGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    thresholds: Array<{ threshold: number; information_gain: number }>,
    currentThreshold: number,
    featureRange: [number, number],
    width: number,
    height: number,
    existingExploredIndices?: Set<number>
): {
    updateGraph: (newThreshold: number) => void;
    exploredIndices: Set<number>;
} => {
    // Adjusted margins - bottom margin increased to accommodate "Best" label
    const margin = { top: 5, right: 10, bottom: 20, left: 45 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;
    
    // Create main group with margins
    const g = svgGroup
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Set up scales - x-axis matches histogram above
    const xScale = d3.scaleLinear()
        .domain(featureRange)
        .range([0, graphWidth]);
    
    const maxGain = d3.max(thresholds, d => d.information_gain) || 1;
    const yScale = d3.scaleLinear()
        .domain([0, maxGain * 1.1]) // Add 10% padding
        .range([graphHeight, 0]);
    
    // Add background
    g.append('rect')
        .attr('width', graphWidth)
        .attr('height', graphHeight)
        .attr('fill', '#f9fafb')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1);
    
    // Add grid lines
    const yTicks = yScale.ticks(3);
    g.selectAll('.grid-line')
        .data(yTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', graphWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');
    
    // Add only y-axis (x-axis is shared with histogram above)
    const yAxis = d3.axisLeft(yScale).ticks(3);
    
    g.append('g')
        .call(yAxis)
        .style('font-size', '10px')
        .style('color', '#6b7280');
    
    // Add y-axis label for Information Gain
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -graphHeight / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#6b7280')
        .text('Info Gain');
    
    // Create line generator
    const lineGenerator = d3.line<{ threshold: number; information_gain: number }>()
        .x(d => xScale(d.threshold))
        .y(d => yScale(d.information_gain))
        .curve(d3.curveMonotoneX); // Smooth curve
    
    // Track explored thresholds (indices into the thresholds array)
    // Use existing set if provided, otherwise create new one
    const exploredIndices = existingExploredIndices || new Set<number>();
    
    // Find the index of the threshold closest to a given value
    const findClosestThresholdIndex = (targetThreshold: number): number => {
        if (thresholds.length === 0) return -1;
        return thresholds.reduce((closestIdx, curr, idx) => {
            const currentDist = Math.abs(curr.threshold - targetThreshold);
            const closestDist = Math.abs(thresholds[closestIdx].threshold - targetThreshold);
            return currentDist < closestDist ? idx : closestIdx;
        }, 0);
    };
    
    // Get all explored points (sorted by threshold value for line drawing)
    const getExploredPoints = () => {
        const indices = Array.from(exploredIndices)
            .filter(idx => idx >= 0 && idx < thresholds.length) // Safety filter
            .sort((a, b) => 
                thresholds[a].threshold - thresholds[b].threshold
            );
        return indices.map(idx => thresholds[idx]);
    };
    
    // Find best threshold among explored points
    const getBestExploredThreshold = () => {
        if (exploredIndices.size === 0) return null;
        let bestIdx = Array.from(exploredIndices)[0];
        for (const idx of exploredIndices) {
            if (thresholds[idx].information_gain > thresholds[bestIdx].information_gain) {
                bestIdx = idx;
            }
        }
        return thresholds[bestIdx];
    };
    
    // Add best threshold marker (vertical dashed line) - will be updated dynamically
    const bestThresholdLine = g.append('line')
        .attr('y1', 0)
        .attr('y2', graphHeight)
        .attr('stroke', '#10b981')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0);
    
    // Add best threshold label (below the graph)
    const bestThresholdLabel = g.append('text')
        .attr('y', graphHeight + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', '#10b981')
        .attr('font-weight', 'bold')
        .text('Best')
        .attr('opacity', 0);
    
    // Add the line path (will be updated)
    const linePath = g.append('path')
        .attr('class', 'info-gain-line')
        .attr('fill', 'none')
        .attr('stroke', '#4f46e5')
        .attr('stroke-width', 2.5);
    
    // Add explored points as dots
    const exploredDotsGroup = g.append('g').attr('class', 'explored-dots');
    
    // Add current point indicator (circle) - shows current threshold on the line
    const currentPoint = g.append('circle')
        .attr('class', 'current-point')
        .attr('r', 5)
        .attr('fill', '#4f46e5')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    
    // Update function
    const updateGraph = (newThreshold: number) => {
        // Mark current threshold as explored
        const currentIdx = findClosestThresholdIndex(newThreshold);
        if (currentIdx === -1) return; // Safety check
        
        exploredIndices.add(currentIdx);
        
        console.log('[Info Gain Graph] Threshold:', newThreshold.toFixed(3), '| Explored points:', exploredIndices.size);
        
        const exploredPoints = getExploredPoints();
        const currentData = thresholds[currentIdx];
        
        // Update line path with all explored points
        if (exploredPoints.length > 0) {
            linePath
                .datum(exploredPoints)
                .attr('d', lineGenerator);
        }
        
        // Update explored dots
        exploredDotsGroup
            .selectAll('circle')
            .data(exploredPoints)
            .join('circle')
            .attr('cx', d => xScale(d.threshold))
            .attr('cy', d => yScale(d.information_gain))
            .attr('r', 2.5)
            .attr('fill', '#4f46e5')
            .attr('opacity', 0.6);
        
        // Update current point position
        currentPoint
            .attr('cx', xScale(currentData.threshold))
            .attr('cy', yScale(currentData.information_gain));
        
        // Update best threshold marker based on explored points
        const bestExplored = getBestExploredThreshold();
        if (bestExplored) {
            const bestX = xScale(bestExplored.threshold);
            bestThresholdLine
                .attr('x1', bestX)
                .attr('x2', bestX)
                .attr('opacity', 0.6);
            bestThresholdLabel
                .attr('x', bestX)
                .attr('opacity', 1);
        }
    };
    
    // Initial render
    updateGraph(currentThreshold);
    
    return { updateGraph, exploredIndices };
};

