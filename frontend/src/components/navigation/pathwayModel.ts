import dagre from "@dagrejs/dagre";
import type { PageUnion } from "../../types/page.ts";
import type { Transition } from "../../types/story.ts";

export const NODE_SIZE = 44;
export const MAX_VISIBLE_NODES = 6;
const NODE_MARGIN = 34;

export interface Point { x: number; y: number }
export interface PathwayNode extends Point { id: number }
export interface PathwayEdge {
    id: string;
    from: number;
    to: number;
    transition: Transition;
    points: Point[];
}
export interface PathwayLayout {
    nodes: PathwayNode[];
    edges: PathwayEdge[];
    width: number;
    height: number;
}
export interface SubpageProgress { index: number; completed: number[] }
export interface Viewport { top: number; left: number; width: number; height: number }
export type NodeState = "current" | "visited" | "available" | "locked";

export function transitionKey(transition: Transition, index: number): string {
    return `${transition.from}-${transition.to}-${index}`;
}

export function getDynamicPage(page: PageUnion | undefined) {
    if (page?.page_type === "dynamic") return page;
    if (page?.page_type === "mixed" && page.dynamic_page.page_type === "dynamic") return page.dynamic_page;
    return null;
}

export function pageTitle(page: PageUnion, index: number): string {
    return page.name || getDynamicPage(page)?.name || `Page ${index + 1}`;
}

export function layoutPathway(pages: PageUnion[], transitions: Transition[]): PathwayLayout {
    const graph = new dagre.graphlib.Graph({ directed: true, multigraph: true });
    graph.setGraph({ rankdir: "TB", nodesep: 32, ranksep: 42, edgesep: 16, marginx: NODE_MARGIN, marginy: NODE_MARGIN });
    graph.setDefaultEdgeLabel(() => ({}));
    pages.forEach((_, id) => graph.setNode(String(id), { width: 62, height: 62 }));
    const valid = transitions.flatMap((transition, index) => {
        if (!Number.isInteger(transition.from) || !Number.isInteger(transition.to) || !pages[transition.from] || !pages[transition.to]) return [];
        const id = transitionKey(transition, index);
        graph.setEdge(String(transition.from), String(transition.to), {}, id);
        return [{ id, transition }];
    });
    if (pages.length === 0) return { nodes: [], edges: [], width: 200, height: 100 };
    dagre.layout(graph);
    const nodes: PathwayNode[] = pages.map((_, id) => ({ id, x: graph.node(String(id)).x, y: graph.node(String(id)).y }));
    const ranks = new Map<number, PathwayNode[]>();
    for (const node of nodes) {
        const rank = Math.round(node.y);
        ranks.set(rank, [...(ranks.get(rank) || []), node]);
    }
    // A chain still feels like a path; branch ranks keep their Dagre lanes.
    [...ranks.values()].sort((a, b) => a[0].y - b[0].y).forEach((rank, index) => {
        if (rank.length === 1 && pages.length > 1) rank[0].x += [-22, 22, 8, -16][index % 4];
    });
    const edges: PathwayEdge[] = valid.map(({ id, transition }) => {
        const points: Point[] = graph.edge({ v: String(transition.from), w: String(transition.to), name: id }).points.map((point: Point) => ({ ...point }));
        const from = nodes[transition.from];
        const to = nodes[transition.to];
        const originalFrom = graph.node(String(transition.from));
        const originalTo = graph.node(String(transition.to));
        points[0].x += from.x - originalFrom.x;
        points[points.length - 1].x += to.x - originalTo.x;
        // End at the circular outline rather than Dagre's rectangular node box.
        for (const [index, node, next] of [[0, from, points[1]], [points.length - 1, to, points[points.length - 2]]] as const) {
            const dx = next.x - node.x;
            const dy = next.y - node.y;
            const distance = Math.hypot(dx, dy) || 1;
            points[index] = { x: node.x + dx / distance * 31, y: node.y + dy / distance * 31 };
        }
        return { id, from: transition.from, to: transition.to, transition, points };
    });
    const allPoints = [...nodes, ...edges.flatMap(edge => edge.points)];
    const shiftX = Math.max(0, NODE_MARGIN - Math.min(...allPoints.map(point => point.x)));
    nodes.forEach(node => { node.x += shiftX; });
    edges.forEach(edge => edge.points.forEach(point => { point.x += shiftX; }));
    const width = Math.max(200, Math.max(...allPoints.map(point => point.x)) + NODE_MARGIN);
    const height = Math.max(...allPoints.map(point => point.y)) + NODE_MARGIN;
    if (width === 200) {
        const offset = (200 - (Math.max(...nodes.map(node => node.x)) + Math.min(...nodes.map(node => node.x)))) / 2;
        nodes.forEach(node => { node.x += offset; });
        edges.forEach(edge => edge.points.forEach(point => { point.x += offset; }));
    }
    return { nodes: nodes.sort((a, b) => a.y - b.y || a.x - b.x || a.id - b.id), edges, width, height };
}

export function nodeStates(layout: PathwayLayout, current: number, visited: ReadonlySet<number>, canExit: boolean, eligible: (transition: Transition) => boolean): Map<number, NodeState> {
    const available = new Set(layout.edges.filter(edge => edge.from === current && canExit && eligible(edge.transition)).map(edge => edge.to));
    return new Map(layout.nodes.map(node => [node.id, node.id === current ? "current" : visited.has(node.id) ? "visited" : available.has(node.id) ? "available" : "locked"]));
}

export function visibleNodes(nodes: PathwayNode[], viewport: Viewport): PathwayNode[] {
    const radius = 32;
    const candidates = nodes.filter(node => node.x + radius > viewport.left && node.x - radius < viewport.left + viewport.width && node.y + radius > viewport.top && node.y - radius < viewport.top + viewport.height);
    const centre = { x: viewport.left + viewport.width / 2, y: viewport.top + viewport.height / 2 };
    const selected = candidates.sort((a, b) => Math.hypot(a.x - centre.x, a.y - centre.y) - Math.hypot(b.x - centre.x, b.y - centre.y)).slice(0, MAX_VISIBLE_NODES);
    return selected.sort((a, b) => a.y - b.y || a.x - b.x || a.id - b.id);
}

export function segmentState(index: number, progress: SubpageProgress | undefined, active: boolean): "completed" | "active" | "future" {
    if (progress?.completed.includes(index)) return "completed";
    if (active && (progress?.index ?? 0) === index) return "active";
    return "future";
}

export function subpageControls(count: number, progress: SubpageProgress | undefined, canAdvance: boolean) {
    const index = progress?.index ?? 0;
    return {
        nextIndex: count > 0 && index < count - 1 && canAdvance ? index + 1 : null,
        canReplay: count > 0 && Array.from({ length: count }, (_, step) => step).every(step => progress?.completed.includes(step)),
    };
}

export function selectSubpage(count: number, progress: SubpageProgress | undefined, target: number, canAdvance: boolean): SubpageProgress | null {
    if (!Number.isInteger(target) || target < 0 || target >= count) return null;
    const completed = progress?.completed ?? [];
    if (completed.includes(target)) return { index: target, completed };
    if (subpageControls(count, progress, canAdvance).nextIndex !== target) return null;
    const index = progress?.index ?? 0;
    return { index: target, completed: completed.includes(index) ? completed : [...completed, index] };
}

export function subpageArc(index: number, count: number, radius = 29): string {
    if (count < 1 || index < 0 || index >= count) return "";
    const step = 2 * Math.PI / count;
    const gap = Math.min(0.14, step / 3);
    const start = -Math.PI / 2 + index * step + gap / 2;
    const end = start + step - gap;
    const point = (angle: number) => `${40 + radius * Math.cos(angle)} ${40 + radius * Math.sin(angle)}`;
    return `M ${point(start)} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${point(end)}`;
}

export function edgePath(points: Point[]): string {
    if (points.length < 2) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const point = points[i];
        const next = points[i + 1];
        path += ` Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
    }
    const last = points[points.length - 1];
    return `${path} L ${last.x} ${last.y}`;
}

export function continuationPoint(points: Point[], viewport: Viewport): Point | null {
    const left = viewport.left + 10;
    const right = viewport.left + viewport.width - 10;
    const top = viewport.top + 10;
    const bottom = viewport.top + viewport.height - 10;
    for (let i = 1; i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        if (start.x < left || start.x > right || start.y < top || start.y > bottom) continue;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const t = Math.min(1, dx > 0 ? (right - start.x) / dx : dx < 0 ? (left - start.x) / dx : Infinity, dy > 0 ? (bottom - start.y) / dy : dy < 0 ? (top - start.y) / dy : Infinity);
        if (t < 1) return { x: start.x + dx * t, y: start.y + dy * t };
    }
    return points[points.length - 1] || null;
}
