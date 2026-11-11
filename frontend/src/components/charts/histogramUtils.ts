import { uiColors } from "../../theme/colors";
// Shared histogram rendering utilities

import type { HistogramData } from "@/types/model";
import { DEFAULT_COLORS } from "@/utils/colorUtils";
import * as d3 from "d3";

export interface HistogramRenderOptions {
    width: number;
    height: number;
    margin?: { top: number; right: number; bottom: number; left: number };
    colorScheme?: string[];
    showAxes?: boolean;
    showLegend?: boolean;
    showThreshold?: boolean;
}

export interface StackedHistogramData {
    bin: number;
    class: string;
    count: number;
    y0: number;
    y1: number;
}

export function prepareHistogramData(
    data: HistogramData
): StackedHistogramData[] {
    if (!data.bins || data.bins.length < 2) return [];

    const bins = data.bins;
    const classes = Object.keys(data.counts_by_class).sort();
    const stackedData: StackedHistogramData[] = [];

    for (let i = 0; i < bins.length - 1; i++) {
        let y0 = 0;
        for (const cls of classes) {
            const count = data.counts_by_class[cls][i] || 0;
            stackedData.push({
                bin: bins[i],
                class: cls,
                count,
                y0,
                y1: y0 + count,
            });
            y0 += count;
        }
    }

    return stackedData;
}

export function renderHistogramBars(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: HistogramData,
    stackedData: StackedHistogramData[],
    options: HistogramRenderOptions
) {
    const {
        width,
        height,
        margin = { top: 0, right: 0, bottom: 0, left: 0 },
        colorScheme = DEFAULT_COLORS,
    } = options;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const bins = data.bins;
    const binWidth = bins.length > 1 ? bins[1] - bins[0] : 1;
    const classes = Object.keys(data.counts_by_class).sort();

    // Create scales
    const xScale = d3
        .scaleLinear()
        .domain(d3.extent(bins) as [number, number])
        .range([0, innerWidth]);

    const maxY = d3.max(stackedData, (d) => d.y1) || 0;
    const yScale = d3.scaleLinear().domain([0, maxY]).range([innerHeight, 0]);

    const colorScale = d3
        .scaleOrdinal<string>()
        .domain(classes)
        .range(colorScheme);

    // Draw bars
    container
        .selectAll(".histogram-bar")
        .data(stackedData)
        .enter()
        .append("rect")
        .attr("class", "histogram-bar")
        .attr("x", (d) => margin.left + xScale(d.bin))
        .attr("y", (d) => margin.top + yScale(d.y1))
        .attr(
            "width",
            Math.max(0, xScale(bins[0] + binWidth) - xScale(bins[0]) - 1)
        )
        .attr("height", (d) => yScale(d.y0) - yScale(d.y1))
        .attr("fill", (d) => colorScale(d.class))
        .attr("opacity", 0.8);

    // Add threshold line if available and requested
    if (options.showThreshold && data.threshold) {
        container
            .append("line")
            .attr("x1", margin.left + xScale(data.threshold))
            .attr("x2", margin.left + xScale(data.threshold))
            .attr("y1", margin.top)
            .attr("y2", margin.top + innerHeight)
            .attr("stroke", uiColors.foreground)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4");
    }

    return { xScale, yScale, colorScale };
}
