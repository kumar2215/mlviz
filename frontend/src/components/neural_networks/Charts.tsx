import * as d3 from "d3";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { DEFAULT_COLORS } from "@/utils/colorUtils";
import { fmt } from "@/utils/neuralNetworks";
import type { Curve, Grid, Network, Sample, Trace } from "@/types/neuralNetworks";
import type { ParameterSelection } from "@/store/neuralNetworks";
import { useResizeObserver } from "@/hooks/useResizeObserver";

type Group = d3.Selection<SVGGElement, unknown, null, undefined>;
const ink = "#334155";
const blue = "#1d4ed8";
const orange = "#c2410c";
function size(context: VisualisationRenderContext) {
    const { width, height, margin } = context.dimensions;
    return { w: Math.max(100, width - margin.left - margin.right), h: Math.max(100, height - margin.top - margin.bottom) };
}
function text(g: Group, value: string, x: number, y: number, color = ink, fontSize = 12) {
    return g.append("text").attr("x", x).attr("y", y).attr("fill", color).attr("font-size", fontSize).attr("text-anchor", "middle").text(value);
}
function Plot<T>({ data, render, label, interactive = false }: { data: T; render: (g: Group, data: T, context: VisualisationRenderContext) => void; label: string; interactive?: boolean }) {
    const { ref, dimensions } = useResizeObserver();
    return <div ref={ref} className="min-h-40 min-w-0 flex-1" role={interactive ? "group" : "img"} aria-label={label}><BaseVisualisation dataConfig={{ data, renderContent: render }} styleConfig={{ dimensions }} capabilities={{}} /></div>;
}
interface NetworkData { network: Network; trace: Trace; selected?: ParameterSelection; onSelect?: (value: ParameterSelection) => void; activeLayer?: number; gradients?: number[][][]; outputLabel?: string }
function renderNetwork(g: Group, data: NetworkData, context: VisualisationRenderContext) {
    g.selectAll("*").remove();
    const { w, h } = size(context);
    const count = data.network.length + 1;
    const radius = Math.max(7, Math.min(21, ((h - 70) / Math.max(...data.trace.a.map(values => values.length)) - 18) / 2));
    const position = (layer: number, row: number) => ({ x: 38 + layer * (w - 76) / (count - 1), y: 40 + (row + 0.5) * (h - 70) / data.trace.a[layer].length });
    for (let l = 0; l < count; l++) {
        text(g, l === 0 ? "Input x" : l === count - 1 ? "Output" : `Hidden ${l}`, position(l, 0).x, 16, ink, 12);
        if (l > 0) text(g, l === count - 1 && data.outputLabel ? data.outputLabel : data.network[l - 1].activation, position(l, 0).x, 34, "#64748b", 10);
    }
    data.network.forEach((layer, l) => layer.weights.forEach((row, j) => row.forEach((weight, k) => {
        const from = position(l, k); const to = position(l + 1, j);
        const selected = data.selected?.layer === l && data.selected.row === j && data.selected.column === k;
        const gradient = data.gradients?.[l]?.[j]?.[k];
        const line = g.append("line").attr("x1", from.x).attr("y1", from.y).attr("x2", to.x).attr("y2", to.y)
            .attr("stroke", selected ? "#0f172a" : (gradient ?? weight) >= 0 ? blue : orange).attr("stroke-width", selected ? 5 : 1 + Math.min(5, Math.abs(gradient ?? weight)))
            .attr("opacity", data.activeLayer !== undefined && data.activeLayer !== l ? 0.2 : 0.65);
        line.append("title").text(`W[${l}][${j}][${k}] = ${fmt(weight)}${gradient === undefined ? "" : `; gradient ${fmt(gradient)}`}`);
        if (data.onSelect) {
            const choose = () => data.onSelect?.({ layer: l, row: j, column: k });
            line.attr("role", "button").attr("tabindex", 0).attr("aria-label", `Inspect weight layer ${l}, neuron ${j}, input ${k}`).style("cursor", "pointer").on("click", choose).on("keydown", (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } });
        }
    })));
    data.trace.a.forEach((values, l) => values.forEach((value, j) => {
        const p = position(l, j);
        g.append("circle").attr("cx", p.x).attr("cy", p.y).attr("r", radius).attr("fill", value >= 0 ? "#dbeafe" : "#ffedd5").attr("stroke", l > 0 && data.selected?.layer === l - 1 && data.selected.row === j ? "#0f172a" : "#93c5fd").attr("stroke-width", 2);
        text(g, fmt(value), p.x, p.y + 3, ink, radius < 14 ? 8 : 10);
        text(g, l === 0 ? `x${j}` : `a${l},${j}`, p.x, p.y + radius + 12, "#64748b", 9);
    }));
}
export function NetworkChart(props: NetworkData) {
    return <Plot data={props} render={renderNetwork} interactive label="Network diagram. Blue edges have positive values; orange edges have negative values. Select a connection to inspect it." />;
}
interface CurveData { functions: Curve[]; domain?: [number, number]; range?: [number, number]; xLabel?: string; yLabel?: string }
function renderCurves(g: Group, data: CurveData, context: VisualisationRenderContext) {
    g.selectAll("*").remove();
    const { w, h } = size(context);
    const x = d3.scaleLinear().domain(data.domain ?? [-5, 5]).range([36, w - 15]);
    const all = data.functions.flatMap(f => f.points.map(point => point[1])).filter(Number.isFinite);
    const extent = d3.extent(all) as [number, number];
    const y = d3.scaleLinear().domain(data.range ?? [Math.min(0, extent[0]), Math.max(1, extent[1])]).nice().range([h - 30, 20]);
    g.append("g").attr("transform", `translate(0,${h - 30})`).call(d3.axisBottom(x).ticks(5));
    g.append("g").attr("transform", "translate(36,0)").call(d3.axisLeft(y).ticks(5));
    const line = d3.line<[number, number]>().defined(d => Number.isFinite(d[1])).x(d => x(d[0])).y(d => y(d[1]));
    data.functions.forEach((f, i) => {
        const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        g.append("path").attr("d", line(f.points.map(point => [point[0], point[1]]))).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2);
        text(g, f.name, 75 + i * 105, 4, color, 11);
        if (f.marker) {
            const [marker, at] = f.marker;
            g.append("circle").attr("cx", x(marker)).attr("cy", y(at)).attr("r", 5).attr("fill", color).append("title").text(`${f.name}(${fmt(marker)}) = ${fmt(at)}`);
        }
    });
    text(g, data.xLabel ?? "Input z", w / 2, h + 1, ink, 10);
    text(g, data.yLabel ?? "Output", 14, 20, ink, 10);
}
export function Curves(props: CurveData) {
    return <Plot data={props} render={renderCurves} label={`${props.yLabel ?? "Output"} plotted against ${props.xLabel ?? "input z"}`} />;
}
export function ActivationChart({ functions, showDerivative = false }: { functions: Curve[]; showDerivative?: boolean }) {
    return <Curves domain={[-5, 5]} functions={showDerivative ? functions : functions.slice(0, 1)} />;
}
interface BoundaryData { grid: Grid; samples: Sample[]; input?: number[]; onInput?: (input: number[]) => void; threshold?: number }
function renderBoundary(g: Group, data: BoundaryData, context: VisualisationRenderContext) {
    g.selectAll("*").remove();
    const { w, h } = size(context);
    const domain: [number, number] = [-0.5, 1.5];
    const x = d3.scaleLinear().domain(domain).range([35, w - 10]);
    const y = d3.scaleLinear().domain(domain).range([h - 28, 15]);
    const n = data.grid.n;
    const cells = data.grid.values.map((value, i) => ({ value, column: i % n, row: Math.floor(i / n) }));
    g.selectAll("rect").data(cells).join("rect").attr("x", d => 35 + d.column * (w - 45) / n).attr("y", d => 15 + d.row * (h - 43) / n)
        .attr("width", (w - 45) / n + 0.5).attr("height", (h - 43) / n + 0.5).attr("fill", d => d3.interpolateRgb("#ffedd5", "#dbeafe")(Math.max(0, Math.min(1, d.value))));
    const contour = (values: number[], color: string, dash?: string) => {
        const contours = d3.contours().size([n, n]).thresholds([data.threshold ?? 0.5])(values);
        const path = d3.geoPath(d3.geoTransform({ point(px, py) { this.stream.point(35 + px * (w - 45) / n, 15 + py * (h - 43) / n); } }));
        g.append("path").datum(contours[0]).attr("d", path).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.5).attr("stroke-dasharray", dash ?? null);
    };
    contour(data.grid.values, blue);
    if (data.grid.oldValues) contour(data.grid.oldValues, "#64748b", "5 4");
    g.append("g").attr("transform", `translate(0,${h - 28})`).call(d3.axisBottom(x).ticks(4));
    g.append("g").attr("transform", "translate(35,0)").call(d3.axisLeft(y).ticks(4));
    data.samples.forEach(sample => {
        g.append("circle").attr("cx", x(sample.x[0])).attr("cy", y(sample.x[1])).attr("r", 8).attr("fill", sample.y[0] ? DEFAULT_COLORS[0] : DEFAULT_COLORS[1]).attr("stroke", "#fff").attr("stroke-width", 2);
        text(g, String(sample.y[0]), x(sample.x[0]), y(sample.x[1]) + 4, "white", 10);
    });
    if (data.input) g.append("circle").attr("cx", x(data.input[0])).attr("cy", y(data.input[1])).attr("r", 12).attr("fill", "none").attr("stroke", "#0f172a").attr("stroke-width", 2);
    if (data.onInput) g.append("rect").attr("x", 35).attr("y", 15).attr("width", w - 45).attr("height", h - 43).attr("fill", "transparent").style("cursor", "crosshair").on("click", function (event) { const point = d3.pointer(event, this); data.onInput?.([x.invert(point[0]), y.invert(point[1])]); });
    text(g, "x₁", w / 2, h, ink, 11); text(g, "x₂", 14, 20, ink, 11);
}
export function Boundary(props: BoundaryData) {
    return <Plot data={props} render={renderBoundary} label="Decision regions. Orange is class 0, blue is class 1; numbered points show targets." />;
}
export function LossHistory({ values }: { values: number[] }) {
    if (values.length < 2) return <p className="py-4 text-sm text-slate-500">Run a few updates to plot loss over time.</p>;
    return <Curves domain={[0, values.length - 1]} xLabel="Update / epoch" yLabel="Loss" functions={[{ name: "Loss", points: values.map((value, index) => [index, value]) }]} />;
}
