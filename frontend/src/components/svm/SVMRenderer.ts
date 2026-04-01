/**
 * SVM Classification D3 Renderer
 * Draws a scatter plot colored by class, with the decision boundary heatmap.
 */

import { renderScatter2D } from "@/components/plots/dimensions/scatter2DrendererUtils";
import type {
    ClassificationConfig,
    DecisionBoundary,
} from "@/components/plots/types";
import { createPlotPoints } from "@/components/plots/utils/dataTransformers";
import { renderLegend } from "@/components/plots/utils/legendHelper";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { createColorScale } from "@/utils/colorUtils";
import * as d3 from "d3";

export interface RenderSVMProps {
    container: d3.Selection<SVGGElement, unknown, null, undefined>;
    points: number[][]; // [x1, x2]
    labels: number[]; // 0/1
    classNames: string[]; // display names for each class index
    supportVectorIndices?: number[];
    alphas?: number[]; // dual coefficients for each point
    scores?: number[]; // decision scores f(x) for each point
    boundaryResolution?: number; // grid side length (default 50)
    x_range: number[];
    y_range: number[];
    xLabel: string;
    yLabel: string;
    context: VisualisationRenderContext;
    decisionBoundary?: DecisionBoundary;
    w1?: number;
    w2?: number;
    bias?: number;
    isLinear?: boolean;
    isKernelSpace?: boolean;
    /** Interaction callback for legend */
    onLegendFilterChange?: (focusedNames: Set<string> | null) => void;
    /** Set of focused labels for toggling visibility */
    focusedLabels?: Set<string> | null;
    /** Optional prediction point [x, y] coordinates */
    predictionPoint?: [number, number];
    /** Optional predicted class index for coloring the prediction point */
    predictedClassIndex?: number;
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
    x_range,
    y_range,
    xLabel,
    yLabel,
    context,
    decisionBoundary,
    alphas,
    scores,
    w1,
    w2,
    bias,
    isLinear,
    isKernelSpace,
    onLegendFilterChange,
    focusedLabels,
    predictionPoint,
    predictedClassIndex,
}: RenderSVMProps): RenderResult {
    const { width, height, margin, scaleFactor = 1 } = context.dimensions;

    // ---- Clear previous render ----
    container.selectAll("*").remove();

    // ---- Prepare Plot Data ----
    const config: ClassificationConfig = {
        type: "classification",
        classNames,
        labels: labels.map((l) => classNames[l] ?? String(l)),
    };

    const plotPoints = createPlotPoints(points, config);
    const bounds = {
        min: [x_range[0], y_range[0]],
        max: [x_range[1], y_range[1]],
    };

    // ---- Main Render via Plot Utils ----
    const renderResult = renderScatter2D(
        container,
        plotPoints,
        bounds,
        [xLabel, yLabel],
        config,
        decisionBoundary,
        {
            width,
            height,
            margin,
            pointRadius: 4 * scaleFactor,
            pointOpacity: 0.7,
            showGrid: true,
            showLegend: true,
            showAxes: true,
            useNiceScales: false, // SVM typically uses fixed ranges
            scaleFactor,
            boundaryOpacity: 0.15,
            onPointHover: (index) => {
                if (index === null) {
                    tooltip.style("visibility", "hidden");
                    return;
                }
                updateTooltip(index);
            },
        },
    );

    const { xScale, yScale, contentGroup, axesGroup } = renderResult;

    // ---- Legend ----
    const legend = renderLegend(
        axesGroup,
        config,
        width - margin.left - margin.right,
        height - margin.top - margin.bottom,
        { position: "bottom-left" },
        scaleFactor,
    );

    if (legend && onLegendFilterChange) {
        legend.onFilterChange(onLegendFilterChange);
    }

    // ---- Custom SV Tooltip & Styling ----
    let tooltip = d3.select("body").select<HTMLDivElement>("#svm-tooltip");
    if (tooltip.empty()) {
        tooltip = d3
            .select("body")
            .append("div")
            .attr("id", "svm-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(255, 255, 255, 0.95)")
            .style("backdrop-filter", "blur(4px)")
            .style("border", "1px solid #e2e8f0")
            .style("border-radius", "8px")
            .style("padding", "8px 12px")
            .style("font-size", "12px")
            .style("font-family", "inherit")
            .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.1)")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("color", "#1e293b");
    }

    const updateTooltip = (i: number) => {
        const alphaVal = alphas && alphas[i] !== undefined ? alphas[i] : 0;
        const isSV =
            (supportVectorIndices && supportVectorIndices.includes(i)) ||
            alphaVal > 1e-7;
        const statusBadge = isSV
            ? `<div style="display: inline-block; background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Support Vector</div>`
            : "";

        let reason = "";
        if (isSV) {
            const score = scores ? scores[i] : null;
            const absScore = score !== null ? Math.abs(score) : null;

            if (absScore !== null) {
                if (absScore > 0.9 && absScore < 1.1) {
                    reason =
                        "Lies exactly on the margin boundary (the critical separator).";
                } else if (absScore < 0.9) {
                    reason =
                        "Breaches the margin or is misclassified—requires a 'Slack' variable to handle.";
                } else {
                    reason =
                        "Influences the decision boundary due to a non-zero Lagrange coefficient (alpha).";
                }
            } else {
                reason =
                    "This point is a support vector because its dual coefficient (alpha) is non-zero.";
            }
        }

        const explanation = isSV
            ? `<div style="margin-top: 6px; font-style: italic; color: #64748b; font-size: 10.5px; line-height: 1.3;">${reason}</div>`
            : "";

        const alphaStr =
            alphas && alphas[i] !== undefined
                ? `<div style="margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px; font-weight: 600; color: #3b82f6;">Alpha: ${alphaVal.toFixed(6)}</div>`
                : "";

        const devInfo =
            import.meta.env.VITE_SHOW_DEV_INFO === "true"
                ? `<div style="margin-top: 4px; color: #94a3b8; font-size: 9px; font-family: monospace;">Index: ${i}</div>`
                : "";

        tooltip.style("visibility", "visible").html(`
            ${statusBadge}
            <div style="font-weight: 600; margin-bottom: 2px;">${classNames[labels[i]] ?? labels[i]}</div>
            <div style="color: #64748b; font-size: 11px;">
                ${xLabel}: ${points[i][0].toFixed(2)}<br/>
                ${yLabel}: ${points[i][1].toFixed(2)}
            </div>
            ${alphaStr}
            ${explanation}
            ${devInfo}
        `);

        tooltip
            .style("top", d3.pointer(event)[1] - 10 + "px")
            .style("left", d3.pointer(event)[0] + 10 + "px");
    };

    // Update point styling and filtering
    contentGroup
        .selectAll("circle")
        .attr("stroke", (_, i) => {
            const isSV =
                supportVectorIndices && supportVectorIndices.includes(i);
            return isSV ? "#27272a" : "white";
        })
        .attr("stroke-width", (_, i) => {
            const isSV =
                supportVectorIndices && supportVectorIndices.includes(i);
            return (isSV ? 2 : 0.5) * scaleFactor;
        })
        .attr("fill-opacity", (_, i) => {
            if (!focusedLabels) return 0.7;
            const name = classNames[labels[i]] ?? String(labels[i]);
            return focusedLabels.has(name) ? 0.7 : 0.1;
        });

    // Handle decision boundary filtering
    const boundaryRects = contentGroup
        .select(".decision-boundary")
        .selectAll<SVGRectElement, unknown>("rect");
    if (!boundaryRects.empty() && focusedLabels) {
        boundaryRects.attr("opacity", function () {
            const prediction = d3.select(this).attr("data-prediction");
            return focusedLabels.has(prediction) ? 0.15 : 0.05;
        });
    }

    // ---- Geometric Decision Line ----
    if (isKernelSpace) {
        // In kernel space (f(x) vs PC1), the boundary is always at f(x) = 0
        drawDecisionLine(contentGroup, 1, 0, 0, xScale, yScale, "#1e293b", 2.5);
        // Margins at f(x) = 1 and f(x) = -1
        drawDecisionLine(
            contentGroup,
            1,
            0,
            -1,
            xScale,
            yScale,
            "#94a3b8",
            1,
            "4 4",
            0.4,
        );
        drawDecisionLine(
            contentGroup,
            1,
            0,
            1,
            xScale,
            yScale,
            "#94a3b8",
            1,
            "4 4",
            0.4,
        );
    } else if (
        isLinear &&
        w1 !== undefined &&
        w2 !== undefined &&
        bias !== undefined
    ) {
        if (Math.abs(w1) > 1e-6 || Math.abs(w2) > 1e-6) {
            drawDecisionLine(
                contentGroup,
                w1,
                w2,
                bias,
                xScale,
                yScale,
                "#1e293b",
                2.5,
            );
            drawMarginBand(contentGroup, w1, w2, bias, xScale, yScale);
            drawDecisionLine(
                contentGroup,
                w1,
                w2,
                bias - 1,
                xScale,
                yScale,
                "#64748b",
                2,
                "5 3",
                0.85,
                `<div style="font-weight:600;margin-bottom:4px;">Margin boundary (+1)</div>
                 <div style="color:#64748b;font-size:11px;line-height:1.5;">
                   <b>w·x + b = +1</b><br/><br/>
                   Support vectors of the positive class sit on or<br/>
                   inside this line. Points between the margins have<br/>
                   a slack variable ξ &gt; 0.
                 </div>`,
            );
            drawDecisionLine(
                contentGroup,
                w1,
                w2,
                bias + 1,
                xScale,
                yScale,
                "#64748b",
                2,
                "5 3",
                0.85,
                `<div style="font-weight:600;margin-bottom:4px;">Margin boundary (−1)</div>
                 <div style="color:#64748b;font-size:11px;line-height:1.5;">
                   <b>w·x + b = −1</b><br/><br/>
                   Support vectors of the negative class sit on or<br/>
                   inside this line. Points between the margins have<br/>
                   a slack variable ξ &gt; 0.
                 </div>`,
            );
        }
    }

    // ---- Predicted Point (Special Marker for Manual Input) ----
    if (predictionPoint && !isKernelSpace) {
        const [px, py] = predictionPoint;
        const pxScaled = xScale(px);
        const pyScaled = yScale(py);
        
        const colorScale = createColorScale(classNames, "default");
        const pointColor = predictedClassIndex !== undefined 
            ? colorScale(classNames[predictedClassIndex] ?? String(predictedClassIndex))
            : "#14b8a6";

        const gPredict = contentGroup.append("g")
            .attr("class", "svm-prediction-point")
            .attr("transform", `translate(${pxScaled}, ${pyScaled})`);
            
        // Dashed reference lines to axes
        gPredict.append("line")
            .attr("class", "prediction-axis-line x-line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", innerHeight - pyScaled)
            .attr("stroke", pointColor)
            .attr("stroke-width", 1.5 * scaleFactor)
            .attr("stroke-dasharray", "4 4")
            .attr("opacity", 0.5);

        gPredict.append("line")
            .attr("class", "prediction-axis-line y-line")
            .attr("x1", 0)
            .attr("x2", -pxScaled)
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("stroke", pointColor)
            .attr("stroke-width", 1.5 * scaleFactor)
            .attr("stroke-dasharray", "4 4")
            .attr("opacity", 0.5);

        // Point marker (slightly bigger than others)
        gPredict.append("circle")
            .attr("r", 6 * scaleFactor)
            .attr("fill", pointColor)
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 1.5 * scaleFactor)
            .attr("class", "animate-pulse"); 

        // Question mark on point
        gPredict.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", `${10 * scaleFactor}px`)
            .style("font-weight", "800")
            .style("fill", "white")
            .style("pointer-events", "none")
            .text("?");

        // Interaction area
        gPredict.append("circle")
            .attr("r", 15 * scaleFactor)
            .attr("fill", "transparent")
            .style("cursor", "default")
            .on("mouseover", function(event) {
                const tooltip = d3.select("body").select<HTMLDivElement>("#svm-tooltip");
                tooltip.style("visibility", "visible")
                    .html(`
                        <div style="font-weight:700; color:${pointColor}; margin-bottom:4px;">Predicted Point</div>
                        <div style="font-size:11px; color:#64748b;">
                            Class: <b>${predictedClassIndex !== undefined ? classNames[predictedClassIndex] : "Unknown"}</b><br/>
                            X: ${px.toFixed(3)}<br/>
                            Y: ${py.toFixed(3)}
                        </div>
                    `);
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 14 + "px");
            })
            .on("mousemove", function(event) {
                const tooltip = d3.select("body").select<HTMLDivElement>("#svm-tooltip");
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 14) + "px");
            })
            .on("mouseout", function() {
                const tooltip = d3.select("body").select<HTMLDivElement>("#svm-tooltip");
                tooltip.style("visibility", "hidden");
            });
    }

    return { xScale, yScale };
}

/**
 * Draws a line w1*x + w2*y + b = 0 across the visible domain.
 */
function drawDecisionLine(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    w1: number,
    w2: number,
    b: number,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    color: string,
    strokeWidth: number = 2,
    dashArray: string | null = null,
    opacity: number = 1,
    tooltipText: string | null = null,
) {
    const [xMin, xMax] = xScale.domain();
    const [yMin, yMax] = yScale.domain();

    // Clip the line w1*x + w2*y + b = 0 to the axes rectangle.
    // Collect candidate intersection points with all four edges, keep those
    // that lie within (or on) the opposite pair of bounds.
    const candidates: [number, number][] = [];

    if (Math.abs(w2) > 1e-9) {
        // left edge x = xMin
        const yL = (-w1 * xMin - b) / w2;
        if (yL >= yMin && yL <= yMax) candidates.push([xMin, yL]);
        // right edge x = xMax
        const yR = (-w1 * xMax - b) / w2;
        if (yR >= yMin && yR <= yMax) candidates.push([xMax, yR]);
    }

    if (Math.abs(w1) > 1e-9) {
        // bottom edge y = yMin
        const xB = (-w2 * yMin - b) / w1;
        if (xB >= xMin && xB <= xMax) candidates.push([xB, yMin]);
        // top edge y = yMax
        const xT = (-w2 * yMax - b) / w1;
        if (xT >= xMin && xT <= xMax) candidates.push([xT, yMax]);
    }

    // De-duplicate (corner hits appear twice) and take the first two distinct points
    const seen = new Set<string>();
    const points: [number, number][] = [];
    for (const p of candidates) {
        const key = `${p[0].toFixed(10)},${p[1].toFixed(10)}`;
        if (!seen.has(key)) {
            seen.add(key);
            points.push(p);
        }
        if (points.length === 2) break;
    }

    if (points.length === 2) {
        const lineGen = d3
            .line<[number, number]>()
            .x((d) => xScale(d[0]))
            .y((d) => yScale(d[1]));

        const pathData = lineGen(points)!;

        g.append("path")
            .attr("class", "svm-decision-line")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", strokeWidth)
            .attr("stroke-dasharray", dashArray ?? "none")
            .attr("stroke-linecap", "round")
            .attr("opacity", opacity)
            .style("pointer-events", "none");

        if (tooltipText) {
            const tooltip = d3.select<HTMLDivElement, unknown>("#svm-tooltip");
            g.append("path")
                .attr("class", "svm-decision-line-hit")
                .attr("d", pathData)
                .attr("fill", "none")
                .attr("stroke", "transparent")
                .attr("stroke-width", 12)
                .style("pointer-events", "stroke")
                .style("cursor", "default")
                .on("mouseover", function () {
                    tooltip.style("visibility", "visible").html(tooltipText);
                })
                .on("mousemove", function (event) {
                    tooltip
                        .style("top", event.pageY - 10 + "px")
                        .style("left", event.pageX + 14 + "px");
                })
                .on("mouseout", function () {
                    tooltip.style("visibility", "hidden");
                });
        }
    }
}

/**
 * Fills the region between the two hard-margin lines (w·x + b = ±1) with a
 * light shaded band. Builds the polygon by walking the four edges of the axes
 * rectangle and splicing in the two margin-line intersection points, so the
 * band always fills flush to the boundary with no corner gaps.
 */
function drawMarginBand(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    w1: number,
    w2: number,
    b: number,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
) {
    const [xMin, xMax] = xScale.domain();
    const [yMin, yMax] = yScale.domain();

    const side = (x: number, y: number, bias: number) => w1 * x + w2 * y + bias;

    // Keep points where -1 <= w·x + b <= +1 by clipping against both half-planes
    // using Sutherland–Hodgman.

    type Pt = [number, number];

    const rectCorners: Pt[] = [
        [xMin, yMin],
        [xMax, yMin],
        [xMax, yMax],
        [xMin, yMax],
    ];

    // Clip a convex polygon against the half-plane: f(x,y) <= 0
    const clipHalfPlane = (
        poly: Pt[],
        f: (x: number, y: number) => number,
    ): Pt[] => {
        if (poly.length === 0) return [];
        const out: Pt[] = [];
        for (let i = 0; i < poly.length; i++) {
            const cur = poly[i];
            const nxt = poly[(i + 1) % poly.length];
            const dCur = f(cur[0], cur[1]);
            const dNxt = f(nxt[0], nxt[1]);
            if (dCur <= 0) out.push(cur);
            if ((dCur < 0 && dNxt > 0) || (dCur > 0 && dNxt < 0)) {
                const t = dCur / (dCur - dNxt);
                out.push([
                    cur[0] + t * (nxt[0] - cur[0]),
                    cur[1] + t * (nxt[1] - cur[1]),
                ]);
            }
        }
        return out;
    };

    // Keep only points where w·x + b <= +1
    let polygon = clipHalfPlane(rectCorners, (x, y) => side(x, y, b - 1));
    // Keep only points where w·x + b >= -1  (negate inequality)
    polygon = clipHalfPlane(polygon, (x, y) => -side(x, y, b + 1));

    if (polygon.length < 3) return;

    g.insert("polygon", ":first-child")
        .attr("class", "svm-margin-band")
        .attr(
            "points",
            polygon.map((p) => `${xScale(p[0])},${yScale(p[1])}`).join(" "),
        )
        .attr("fill", "#64748b")
        .attr("fill-opacity", 0.08)
        .attr("stroke", "none")
        .style("pointer-events", "none");
}
