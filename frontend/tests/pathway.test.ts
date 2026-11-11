import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutPathway, pageTitle, nodeStates, segmentState, selectSubpage, subpageArc, subpageControls, visibleNodes, pathwayCanvasOffset, pathwayMarkerPosition, PATHWAY_MARKER_SIZE, PATHWAY_NODE_EXTENT } from "../src/components/navigation/pathwayModel.ts";
import { displayCondition, isConditionMet } from "../src/utils/conditions.ts";
import { createColorScale, createContinuousColorScale, type PaletteName, type ContinuousSchemeName } from "../src/utils/colorUtils.ts";
import { hsl } from "d3";
import type { PageUnion, Parameters } from "../src/types/page.ts";
import type { Transition } from "../src/types/story.ts";
import type { HistoryState } from "../src/types/history.ts";
import type { Condition } from "../src/types/condition.ts";

const pages = (count: number): PageUnion[] => Array.from({ length: count }, (_, index) => ({ page_type: "static", text: `# Page ${index + 1}`, path: "" }));
const bypass = (from: number, to: number): Transition => ({ from, to, condition: { condition_type: "Bypass" } });
const checker = (history: HistoryState, now = Date.now()) => (transition: Transition) => isConditionMet(transition.condition, { ...history.params, __history: history, __now: now } as unknown as Record<string, Parameters>, { sourcePageId: transition.from });
const history = (): HistoryState => ({ params: {}, entries: [], path: [] });

test("only configured connections exist, including parallel edges and return loops", () => {
    const transitions = [bypass(0, 2), bypass(2, 0), bypass(0, 2), bypass(8, 0)];
    const graph = layoutPathway(pages(3), transitions);
    assert.equal(graph.edges.length, 3);
    assert.equal(new Set(graph.edges.map(edge => edge.id)).size, 3);
    assert.ok(graph.edges.every(edge => edge.from !== 1 && edge.to !== 1));
    assert.ok(graph.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
    assert.ok(graph.edges.every(edge => edge.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))));
});

test("one eligible parallel transition enables a successor, but future bypass edges do not unlock later pages", () => {
    const transitions: Transition[] = [{ from: 0, to: 1, condition: { condition_type: "Button", button_id: "answer" } }, bypass(0, 1), bypass(1, 2)];
    const graph = layoutPathway(pages(3), transitions);
    const states = nodeStates(graph, 0, new Set([0]), true, checker(history()));
    assert.equal(states.get(0), "current");
    assert.equal(states.get(1), "available");
    assert.equal(states.get(2), "locked");
    assert.equal(nodeStates(graph, 0, new Set([0]), false, checker(history())).get(1), "locked");
});

test("real activity completion unlocks its edge; subpage exit gates still apply and visited pages can be revisited", () => {
    const state = history();
    const transitions: Transition[] = [{ from: 0, to: 1, condition: { condition_type: "Button", button_id: "answer" } }];
    const graph = layoutPathway(pages(3), transitions);
    assert.equal(nodeStates(graph, 0, new Set([0]), true, checker(state)).get(1), "locked");
    state.entries.push({ actionType: "button_click", timestamp: 10, button_id: "answer" });
    assert.equal(nodeStates(graph, 0, new Set([0]), true, checker(state)).get(1), "available");
    assert.equal(nodeStates(graph, 0, new Set([0]), false, checker(state)).get(1), "locked");
    assert.equal(nodeStates(graph, 0, new Set([0, 2]), false, checker(state)).get(2), "visited");
});

test("Completed requires the transition's source page, including in compound conditions", () => {
    const state = history();
    state.entries.push({ actionType: "page_complete", page_id: 0, timestamp: 10 });
    const params = { __history: state } as unknown as Record<string, Parameters>;
    const completed: Condition = { condition_type: "Completed" };
    assert.equal(isConditionMet(completed, params), false, "A missing source cannot match completion");
    assert.equal(isConditionMet(completed, params, { sourcePageId: 0 }), true);
    assert.equal(isConditionMet(completed, params, { sourcePageId: 1 }), false);
    const compound: Condition = { condition_type: "And", conditions: [
        { condition_type: "Bypass" },
        { condition_type: "Or", conditions: [completed, { condition_type: "Button", button_id: "alternative" }] },
    ] };
    assert.equal(isConditionMet(compound, params, { sourcePageId: 0 }), true);
    assert.equal(isConditionMet(compound, params, { sourcePageId: 1 }), false);
    assert.equal(isConditionMet(compound, params), false);
    assert.equal(isConditionMet({ condition_type: "ActionCount", action: "page_complete", min: 1 }, params), true);
    assert.equal(isConditionMet({ condition_type: "ActionCount", action: "page_complete", min: 2 }, params), false);
    assert.equal(displayCondition(completed), "Complete the current activity to unlock this page.");
    const graph = layoutPathway(pages(3), [
        { from: 0, to: 1, condition: completed },
        { from: 1, to: 2, condition: completed },
    ]);
    assert.equal(nodeStates(graph, 0, new Set([0]), true, checker(state)).get(1), "available");
    assert.equal(nodeStates(graph, 1, new Set([0, 1]), true, checker(state)).get(2), "locked");
});

test("wait gates update over time and latest-result metric gates can become unavailable again", () => {
    const state = history();
    state.entries.push({ actionType: "page_visit", timestamp: 1000, page_id: 0 });
    const wait: Transition = { from: 0, to: 1, condition: { condition_type: "Wait", wait: 2 } };
    const graph = layoutPathway(pages(2), [wait]);
    assert.equal(nodeStates(graph, 0, new Set([0]), true, checker(state, 2000)).get(1), "locked");
    assert.equal(nodeStates(graph, 0, new Set([0]), true, checker(state, 4000)).get(1), "available");
    const metric: Transition = { from: 0, to: 1, condition: { condition_type: "Metric", metric: "train.accuracy", comparator: ">=", value: 0.9, evaluation_mode: "latest" } };
    const metricGraph = layoutPathway(pages(2), [metric]);
    state.entries.push({ actionType: "train", timestamp: 5000, metrics: { train: { accuracy: 0.95 } } });
    assert.equal(nodeStates(metricGraph, 0, new Set([0]), true, checker(state)).get(1), "available");
    state.entries.push({ actionType: "train", timestamp: 6000, metrics: { train: { accuracy: 0.5 } } });
    assert.equal(nodeStates(metricGraph, 0, new Set([0]), true, checker(state)).get(1), "locked");
});

test("branch layout is deterministic and a plain chain winds rather than becoming a straight vertical line", () => {
    const transitions = [bypass(0, 1), bypass(0, 2), bypass(1, 3), bypass(2, 3)];
    const graph = layoutPathway(pages(4), transitions);
    assert.deepEqual(graph, layoutPathway(pages(4), transitions));
    assert.notEqual(graph.nodes.find(node => node.id === 1)?.x, graph.nodes.find(node => node.id === 2)?.x);
    const chain = layoutPathway(pages(4), [bypass(0, 1), bypass(1, 2), bypass(2, 3)]);
    assert.ok(new Set(chain.nodes.map(node => node.x)).size > 1);
});

test("chain positions vary across both sides with their mean at the panel center", () => {
    for (const count of [1, 2, 3, 7, 13, 40]) {
        const transitions = Array.from({ length: count - 1 }, (_, id) => bypass(id, id + 1));
        const graph = layoutPathway(pages(count), transitions);
        assert.deepEqual(graph, layoutPathway(pages(count), transitions), "Repeated layouts keep identical coordinates");
        const mean = graph.nodes.reduce((sum, node) => sum + node.x, 0) / count;
        assert.ok(Math.abs(mean - graph.width / 2) < 1e-9);
        if (count > 1) {
            assert.ok(graph.nodes.some(node => node.x < mean - 10));
            assert.ok(graph.nodes.some(node => node.x > mean + 10));
        }
        for (const viewportWidth of [240, 284, 360]) {
            assert.ok(graph.width <= viewportWidth, "A plain chain fits the sidebar with mascot clearance");
            const offset = pathwayCanvasOffset(graph.width, viewportWidth);
            assert.ok(Math.abs(mean + offset - viewportWidth / 2) < 1e-9);
            assert.equal(visibleNodes(graph.nodes, { left: -offset, top: 0, width: viewportWidth, height: graph.height }).length, count);
        }
    }
    const graph = layoutPathway(pages(13), Array.from({ length: 12 }, (_, id) => bypass(id, id + 1)));
    assert.ok(new Set(graph.nodes.map(node => Math.round(node.x))).size > 8, "The path has more variety than a repeating four-position pattern");
});

test("wide branch layouts keep their lanes and horizontal scrolling", () => {
    const transitions = Array.from({ length: 6 }, (_, id) => bypass(0, id + 1));
    const graph = layoutPathway(pages(7), transitions);
    assert.ok(graph.width > 284);
    assert.equal(pathwayCanvasOffset(graph.width, 284), 0);
    const branches = graph.nodes.filter(node => node.id !== 0).sort((a, b) => a.x - b.x);
    for (let index = 1; index < branches.length; index++) assert.ok(branches[index].x - branches[index - 1].x >= 100);
    assert.ok(visibleNodes(graph.nodes, { left: graph.width - 284, top: 0, width: 284, height: graph.height }).some(node => node.id === branches.at(-1)!.id));
});

test("virtualisation includes every intersecting node and scrolling reveals the final page", () => {
    const wide = layoutPathway(pages(20), []);
    assert.equal(visibleNodes(wide.nodes, { top: 0, left: 0, width: wide.width, height: wide.height }).length, 20);
    const chain = layoutPathway(pages(20), Array.from({ length: 19 }, (_, id) => bypass(id, id + 1)));
    const window = visibleNodes(chain.nodes, { top: chain.height - 240, left: 0, width: chain.width, height: 240 });
    assert.ok(window.length < chain.nodes.length);
    assert.ok(window.some(node => node.id === 19));
    assert.ok(window.every(node => node.y + PATHWAY_NODE_EXTENT > chain.height - 240 && node.y - PATHWAY_NODE_EXTENT < chain.height));
    assert.ok(visibleNodes(chain.nodes, { top: 0, left: 0, width: chain.width, height: chain.height }).length > 6);
    assert.equal(visibleNodes(chain.nodes, { top: 0, left: chain.width + 64, width: 200, height: chain.height }).length, 0);
});

test("a visible subpage is active, not completed; a restarted ring clears old segments", () => {
    assert.equal(segmentState(0, { index: 0, completed: [] }, true), "active");
    assert.equal(segmentState(1, { index: 0, completed: [] }, true), "future");
    assert.equal(segmentState(0, { index: 1, completed: [0] }, false), "completed");
    assert.equal(segmentState(0, { index: 0, completed: [] }, false), "future");
});

test("navigation uses configured page names directly without reading or formatting Markdown", () => {
    assert.equal(pageTitle({ page_type: "dynamic", name: "Follow Questions", parameters: {} }, 0), "Follow Questions");
    assert.equal(pageTitle({ page_type: "dynamic", name: "Keep_ThisName", parameters: {} }, 0), "Keep_ThisName");
    assert.equal(pageTitle({ page_type: "static", name: "Introduction", text: "---\ntitle: Another title\n---\n# Other heading", path: "" }, 0), "Introduction");
    assert.equal(pageTitle({ page_type: "static", text: "# A Markdown heading", path: "missing.md" }, 2), "Page 3");
    assert.equal(pageTitle({
        page_type: "mixed",
        static_page: { page_type: "static", text: "# Other heading", path: "" },
        dynamic_page: { page_type: "dynamic", name: "Compare Iris Splits", parameters: {} },
    }, 0), "Compare Iris Splits");
});

test("subpage arcs only advance one ready step and replay requires every step to be completed", () => {
    assert.deepEqual(subpageControls(3, undefined, false), { nextIndex: null, canReplay: false });
    assert.deepEqual(subpageControls(3, { index: 0, completed: [0] }, true), { nextIndex: 1, canReplay: false });
    assert.deepEqual(subpageControls(3, { index: 1, completed: [0, 1] }, true), { nextIndex: 2, canReplay: false });
    assert.deepEqual(subpageControls(3, { index: 2, completed: [0, 1] }, false), { nextIndex: null, canReplay: false });
    assert.deepEqual(subpageControls(3, { index: 2, completed: [0, 1, 2] }, true), { nextIndex: null, canReplay: true });
    assert.deepEqual(subpageControls(3, { index: 0, completed: [] }, true), { nextIndex: 1, canReplay: false });
    assert.deepEqual(subpageControls(0, undefined, true), { nextIndex: null, canReplay: false });
    assert.deepEqual(subpageControls(1, { index: 0, completed: [0] }, true), { nextIndex: null, canReplay: true });
});

test("subpage hit targets have distinct arcs, including a single subpage", () => {
    for (const count of [1, 2, 6, 20]) {
        const arcs = Array.from({ length: count }, (_, index) => subpageArc(index, count));
        assert.equal(new Set(arcs).size, count);
        assert.ok(arcs.every(arc => arc.startsWith("M ") && arc.includes("A 29 29") && !arc.includes("NaN")));
    }
    assert.equal(subpageArc(0, 0), "");
});

test("the current-position mascot follows arc midpoints without overlapping the ring", () => {
    assert.deepEqual(pathwayMarkerPosition(0, 0), { x: 90, y: 40 });
    for (const count of [1, 2, 3, 6, 20]) {
        for (let index = 0; index < count; index++) {
            const point = pathwayMarkerPosition(index, count);
            const angle = -Math.PI / 2 + (index + 0.5) * 2 * Math.PI / count;
            assert.ok(Math.abs(point.x - (40 + 50 * Math.cos(angle))) < 0.001);
            assert.ok(Math.abs(point.y - (40 + 50 * Math.sin(angle))) < 0.001);
            assert.ok(Math.hypot(point.x - 40, point.y - 40) - PATHWAY_MARKER_SIZE / 2 > 31);
        }
    }
});

test("graph padding and viewport culling leave room for the position mascot", () => {
    const graph = layoutPathway(pages(3), [bypass(0, 1), bypass(1, 2)]);
    for (const node of graph.nodes) {
        for (const count of [0, 1, 2, 6]) {
            for (let index = 0; index < Math.max(count, 1); index++) {
                const point = pathwayMarkerPosition(index, count);
                const x = node.x - 40 + point.x;
                const y = node.y - 40 + point.y;
                assert.ok(x - PATHWAY_MARKER_SIZE / 2 >= 0 && x + PATHWAY_MARKER_SIZE / 2 <= graph.width);
                assert.ok(y - PATHWAY_MARKER_SIZE / 2 >= 0 && y + PATHWAY_MARKER_SIZE / 2 <= graph.height);
            }
        }
    }
    assert.equal(visibleNodes([{ id: 0, x: 100, y: 100 }], { left: 150, top: 90, width: 10, height: 20 }).length, 1, "Keep the node mounted while its mascot intersects the viewport");
});

test("completed subpages can be reviewed before the page is finished without clearing progress", () => {
    const progress = { index: 2, completed: [0, 1] };
    const review = selectSubpage(4, progress, 0, false);
    assert.deepEqual(review, { index: 0, completed: [0, 1] });
    assert.strictEqual(review?.completed, progress.completed);
    assert.deepEqual(progress, { index: 2, completed: [0, 1] });
    assert.deepEqual(selectSubpage(4, review!, 1, true), { index: 1, completed: [0, 1] });
    assert.deepEqual(selectSubpage(4, { ...review!, index: 1 }, 2, true), progress);
    assert.equal(selectSubpage(4, review!, 3, true), null);
    assert.equal(selectSubpage(4, progress, 3, false), null);
    assert.equal(selectSubpage(4, progress, -1, true), null);
    assert.equal(selectSubpage(4, progress, 4, true), null);
    assert.equal(selectSubpage(4, progress, 1.5, true), null);
});

test("every completed page arc stays accessible and replay stays available while reviewing any step", () => {
    const completed = [0, 1, 2];
    for (const index of completed) {
        const review = selectSubpage(3, { index: 2, completed }, index, false);
        assert.deepEqual(review, { index, completed });
        assert.equal(subpageControls(3, review!, false).canReplay, true);
        assert.strictEqual(review?.completed, completed);
    }
    assert.equal(subpageControls(3, { index: 0, completed: [] }, false).canReplay, false);
});

test("all categorical palettes and legacy continuous-scheme names render without purple hues", () => {
    const isPurple = (color: string) => {
        const value = hsl(color);
        return value.s > 0.08 && value.h >= 235 && value.h <= 345;
    };
    const paletteNames: PaletteName[] = ["default", "category10", "dark2", "set3", "paired", "pastel1"];
    const labels = Array.from({ length: 20 }, (_, index) => `Class ${index}`);
    for (const palette of paletteNames) {
        const scale = createColorScale(labels, palette);
        assert.ok(labels.every(label => !isPurple(scale(label))), palette);
    }
    const schemeNames: ContinuousSchemeName[] = ["viridis", "plasma", "inferno", "magma", "cividis", "blues", "greens", "reds", "purples", "oranges", "greys", "turbo", "cool", "warm"];
    for (const scheme of schemeNames) {
        const scale = createContinuousColorScale([0, 1], scheme);
        assert.ok(Array.from({ length: 101 }, (_, index) => scale(index / 100)).every(color => !isPurple(color)), scheme);
    }
});
