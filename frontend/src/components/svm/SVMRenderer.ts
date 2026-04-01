/**
 * SVM Classification D3 Renderer
 * Draws a scatter plot colored by class, with the decision boundary heatmap.
 */

import { renderDecisionBoundary2D } from "@/components/plots/dimensions/scatter2DrendererUtils";
import type { DecisionBoundary } from "@/components/plots/types";
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
}: RenderSVMProps): RenderResult {
    const { width, height, margin } = context.dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // ---- Scales ----
    const xScale = d3.scaleLinear().domain(x_range).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(y_range).range([innerHeight, 0]);

    // ---- Clear previous render ----
    container
        .selectAll(".zoom-content, .axes-fixed, .svm-label, .svm-clip")
        .remove();

    // ---- Clip path so all content stays within the axes bounds ----
    const clipId = "svm-clip-" + Math.random().toString(36).slice(2);
    container
        .append("clipPath")
        .attr("class", "svm-clip")
        .attr("id", clipId)
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight);

    const contentGroup = container
        .append("g")
        .attr("class", "zoom-content")
        .attr("clip-path", `url(#${clipId})`);
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
        // Only draw if we have meaningful weights (avoiding [0,0] initial state)
        if (Math.abs(w1) > 1e-6 || Math.abs(w2) > 1e-6) {
            // Main decision boundary: w1*x + w2*y + b = 0
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

            // Soft-margin boundaries: w1*x + w2*y + b = ±1
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
                   a slack variable ξ &gt; 0 — the <b>C</b> parameter<br/>
                   controls how much this is penalised.
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
                   a slack variable ξ &gt; 0 — the <b>C</b> parameter<br/>
                   controls how much this is penalised.
                 </div>`,
            );
        }
    }

    // ---- Axes ----
    const xAxisGroup = axesGroup
        .append("g")
        .attr("class", "svm-axis-x x-axis")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((g) => {
            g.selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#94a3b8");
            g.selectAll("line, path").style("stroke", "#e2e8f0");
        });
    const yAxisGroup = axesGroup
        .append("g")
        .attr("class", "svm-axis-y y-axis")
        .call(d3.axisLeft(yScale).ticks(6))
        .call((g) => {
            g.selectAll("text")
                .style("font-size", "11px")
                .style("fill", "#94a3b8");
            g.selectAll("line, path").style("stroke", "#e2e8f0");
        });

    (xAxisGroup.node() as any).__xScale__ = xScale.copy();
    (yAxisGroup.node() as any).__yScale__ = yScale.copy();

    axesGroup
        .append("text")
        .attr("class", "svm-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text(xLabel);
    axesGroup
        .append("text")
        .attr("class", "svm-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 14)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text(yLabel);

    // ---- Custom Tooltip ----
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

    // ---- Scatter points ----
    const scatterGroup = contentGroup
        .append("g")
        .attr("class", "svm-scatter")
        .style("pointer-events", "all");

    const isSV = (i: number) =>
        supportVectorIndices && supportVectorIndices.includes(i);

    const circles = scatterGroup
        .selectAll("circle.pt")
        .data(points)
        .join("circle")
        .attr("class", "pt")
        .attr("cx", (d) => xScale(d[0]))
        .attr("cy", (d) => yScale(d[1]))
        .attr("r", () => 4)
        .attr("fill", (_, i) =>
            colorScale(classNames[labels[i]] ?? String(labels[i])),
        )
        .attr("fill-opacity", 0.7)
        .attr("stroke", (_, i) => (isSV(i) ? "#27272a" : "white"))
        .attr("stroke-width", (_, i) => (isSV(i) ? 2 : 0.5))
        .attr(
            "data-class",
            (_, i) => classNames[labels[i]] ?? String(labels[i]),
        )
        .attr("cursor", "pointer");

    circles
        .on("mouseover", function (_event, d) {
            const i = circles.nodes().indexOf(this);
            const alphaVal = alphas && alphas[i] !== undefined ? alphas[i] : 0;
            const isSupport = isSV(i) || alphaVal > 1e-7;
            const statusBadge = isSupport
                ? `<div style="display: inline-block; background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Support Vector</div>`
                : "";

            let reason = "";
            if (isSupport) {
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

            const explanation = isSupport
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
                        ${xLabel}: ${d[0].toFixed(2)}<br/>
                        ${yLabel}: ${d[1].toFixed(2)}
                    </div>
                    ${alphaStr}
                    ${explanation}
                    ${devInfo}
                `);

            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", isSV(i) ? 8 : 6)
                .attr("fill-opacity", 1)
                .attr("stroke", "#1e293b");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("top", event.pageY - 10 + "px")
                .style("left", event.pageX + 10 + "px");
        })
        .on("mouseout", function () {
            const i = circles.nodes().indexOf(this);
            tooltip.style("visibility", "hidden");

            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", () => 4)
                .attr("fill-opacity", 0.7)
                .attr("stroke", isSV(i) ? "#27272a" : "white");
        });

    // ---- Legend (tied to points + boundary regions) ----
    const config = { type: "classification" as const, classNames, labels: [] };
    const scaleFactor = width / 800;
    const legend = renderLegend(
        axesGroup,
        config,
        innerWidth,
        innerHeight,
        { position: "bottom-left" },
        scaleFactor,
    );

    if (legend) {
        legend.onFilterChange((focusedNames) => {
            // Dim/restore scatter points
            scatterGroup
                .selectAll<SVGCircleElement, unknown>("circle.pt")
                .transition()
                .duration(200)
                .attr("fill", function (_, i) {
                    const name = classNames[labels[i]] ?? String(labels[i]);
                    if (focusedNames === null) return colorScale(name);
                    return focusedNames.has(name)
                        ? colorScale(name)
                        : "#d1d5db";
                })
                .attr("fill-opacity", function (_, i) {
                    if (focusedNames === null) return 0.7;
                    const name = classNames[labels[i]] ?? String(labels[i]);
                    return focusedNames.has(name) ? 0.7 : 0.3;
                });

            // Dim/restore decision boundary regions
            const boundaryRects = contentGroup
                .select(".decision-boundary")
                .selectAll<SVGRectElement, unknown>("rect");
            if (!boundaryRects.empty()) {
                const categoricalScale = colorScale;
                boundaryRects
                    .transition()
                    .duration(200)
                    .attr("fill", function () {
                        const prediction = d3
                            .select(this)
                            .attr("data-prediction");
                        if (focusedNames === null)
                            return categoricalScale(prediction);
                        return focusedNames.has(prediction)
                            ? categoricalScale(prediction)
                            : "#e5e7eb";
                    })
                    .attr("opacity", function () {
                        if (focusedNames === null) return 0.15;
                        const prediction = d3
                            .select(this)
                            .attr("data-prediction");
                        return focusedNames.has(prediction) ? 0.15 : 0.05;
                    });
            }
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
