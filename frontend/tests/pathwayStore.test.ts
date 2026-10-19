import assert from "node:assert/strict";
import { test } from "node:test";
import { canAdvanceSubpage, canExitPage, createPathwayStore, selectPathwayNode, transitionAvailable, pageSubpages, type PathwayDefinition, type PathwayHistorySource } from "../src/store/pathwayStore.ts";
import type { HistoryState } from "../src/types/history.ts";
import { useDragSelectionStore } from "../src/store/useDragSelectionStore.ts";
import { readFileSync } from "node:fs";
import { unrollStory } from "../src/utils/storyReferences.ts";
import type Story from "../src/types/story.ts";
import type Visualisation from "../src/types/visualisation.ts";

const definition = (): PathwayDefinition => ({
    pages: [
        { page_type: "dynamic", name: "Exercise", parameters: {}, subpages: ["First", "Second", "Third"] },
        { page_type: "static", text: "# Next page", path: "" },
        { page_type: "static", text: "# Last page", path: "" },
    ],
    transitions: [
        { from: 0, to: 1, condition: { condition_type: "Completed" } },
        { from: 1, to: 2, condition: { condition_type: "Bypass" } },
    ],
});

function session(config = definition()) {
    let history: HistoryState = { params: {}, entries: [], path: [] };
    let time = 1000;
    const listeners = new Set<(history: HistoryState) => void>();
    const publish = (next: HistoryState) => { history = next; listeners.forEach(listener => listener(history)); };
    const source: PathwayHistorySource = {
        getHistory: () => history,
        subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
        recordAction: entry => publish({ ...history, entries: [...history.entries, entry] }),
        addPageVisit: pageId => publish({ ...history, path: [...history.path, pageId], entries: [...history.entries, { actionType: "page_visit", timestamp: time, page_id: pageId }] }),
        now: () => time,
    };
    const store = createPathwayStore(config, source);
    const unsubscribe = source.subscribe(store.getState().syncHistory);
    store.getState().start();
    return { store, source, unsubscribe, advanceClock: (value: number) => { time = value; } };
}

function completeSubpages(store: ReturnType<typeof createPathwayStore>) {
    const pageId = store.getState().currentPageId;
    const count = pageSubpages(store.getState()).length;
    for (let index = 0; index < count; index++) {
        store.getState().markSubpageReady(pageId, index);
        if (index < count - 1) store.getState().navigateSubpage(pageId, index + 1);
    }
}

function completionCallback(store: ReturnType<typeof createPathwayStore>) {
    const { currentPageId: pageId, subpageIndex, sessionId, replayKey } = store.getState();
    return () => store.getState().completePage({ pageId, subpageIndex, sessionId, replayKey });
}

function exerciseDefinition(): PathwayDefinition {
    const config = definition();
    config.pages[0] = { page_type: "dynamic", name: "Exercise", parameters: {} };
    return config;
}

test("completion records the page once and unlocks its edge without navigating", () => {
    const { store, source } = session(exerciseDefinition());
    const complete = completionCallback(store);
    assert.equal(selectPathwayNode(store.getState(), 1).state, "locked");
    complete();
    complete();
    assert.deepEqual(source.getHistory().entries.filter(entry => entry.actionType === "page_complete"), [
        { actionType: "page_complete", page_id: 0, timestamp: 1000 },
    ]);
    assert.equal(store.getState().currentPageId, 0);
    assert.equal(selectPathwayNode(store.getState(), 1).state, "available");
    store.getState().navigatePage(1);
    assert.equal(store.getState().currentPageId, 1);
    completionCallback(store)();
    assert.equal(source.getHistory().entries.filter(entry => entry.actionType === "page_complete").length, 1, "Static pages cannot complete an exercise");
});

test("completion requires every subpage to be ready and rejects callbacks from earlier steps", () => {
    const { store, source } = session();
    const firstComplete = completionCallback(store);
    firstComplete();
    assert.equal(canAdvanceSubpage(store.getState()), false);
    store.getState().markSubpageReady(0, 0);
    store.getState().navigateSubpage(0, 1);
    firstComplete();
    completionCallback(store)();
    store.getState().markSubpageReady(0, 1);
    store.getState().navigateSubpage(0, 2);
    const lastComplete = completionCallback(store);
    lastComplete();
    assert.equal(source.getHistory().entries.some(entry => entry.actionType === "page_complete"), false);
    assert.equal(selectPathwayNode(store.getState(), 1).state, "locked");
    store.getState().markSubpageReady(0, 2);
    lastComplete();
    assert.equal(selectPathwayNode(store.getState(), 1).state, "available");
    assert.equal(store.getState().currentPageId, 0);
});

test("returning to a subpage invalidates its previous completion and readiness callbacks", () => {
    const { store, source } = session();
    completeSubpages(store);
    const staleComplete = completionCallback(store);
    const { sessionId, replayKey } = store.getState();
    const staleReady = () => store.getState().markSubpageReady(0, 2, sessionId ?? undefined, replayKey);
    store.getState().navigateSubpage(0, 0);
    store.getState().navigateSubpage(0, 2);
    staleComplete();
    assert.equal(source.getHistory().entries.some(entry => entry.actionType === "page_complete"), false);
    store.getState().replayPage(0);
    store.getState().markSubpageReady(0, 0);
    store.getState().navigateSubpage(0, 1);
    store.getState().markSubpageReady(0, 1);
    store.getState().navigateSubpage(0, 2);
    staleReady();
    staleComplete();
    assert.deepEqual(store.getState().progressByPage[0].completed, [0, 1]);
    completionCallback(store)();
    assert.equal(source.getHistory().entries.some(entry => entry.actionType === "page_complete"), false);
    store.getState().markSubpageReady(0, 2);
    completionCallback(store)();
    assert.equal(source.getHistory().entries.filter(entry => entry.actionType === "page_complete").length, 1);
});

test("a callback from a prior page visit cannot complete that page after returning", () => {
    const config = exerciseDefinition();
    config.transitions[0].condition = { condition_type: "Bypass" };
    const { store, source } = session(config);
    const staleComplete = completionCallback(store);
    store.getState().navigatePage(1);
    staleComplete();
    store.getState().navigatePage(0);
    staleComplete();
    assert.equal(source.getHistory().entries.some(entry => entry.actionType === "page_complete"), false);
    completionCallback(store)();
    assert.equal(source.getHistory().entries.filter(entry => entry.actionType === "page_complete").length, 1);
});

test("completion callbacks cannot cross sessions even when the page and replay version match", () => {
    const first = session(exerciseDefinition());
    const store = first.store;
    store.getState().openSession("first", exerciseDefinition(), first.source);
    const staleComplete = completionCallback(store);
    const next = session(exerciseDefinition());
    store.getState().openSession("second", exerciseDefinition(), next.source);
    store.setState({ replayKey: store.getState().replayKey - 1 });
    staleComplete();
    assert.equal(next.source.getHistory().entries.some(entry => entry.actionType === "page_complete"), false);
    completionCallback(store)();
    assert.equal(next.source.getHistory().entries.filter(entry => entry.actionType === "page_complete").length, 1);
    assert.equal(first.source.getHistory().entries.some(entry => entry.actionType === "page_complete"), false);
});

function visualisation(name: string): Visualisation {
    return { ...JSON.parse(readFileSync(new URL(`../public/config/visual/nlp/${name}.json`, import.meta.url), "utf8")), name, category: "nlp" };
}

test("the expanded NLP story uses the local source page for each exercise's completion", () => {
    const story: Story = { ...JSON.parse(readFileSync(new URL("../public/config/story/text_preprocessing.json", import.meta.url), "utf8")), name: "text_preprocessing" };
    const visualisations = Object.fromEntries(["regex", "porter", "tokenization"].map(name => [name, visualisation(name)]));
    const expanded = unrollStory(story, { stories: {}, visualisations });
    const { store, source } = session(expanded);
    const completionPages = new Set([2, 5, 7, 8, 9]);
    assert.equal(expanded.pages.length, 11);
    for (let pageId = 0; pageId < expanded.pages.length - 1; pageId++) {
        assert.equal(store.getState().currentPageId, pageId);
        if (completionPages.has(pageId)) {
            assert.equal(selectPathwayNode(store.getState(), pageId + 1).state, "locked");
            completeSubpages(store);
            assert.equal(selectPathwayNode(store.getState(), pageId + 1).state, "locked", "Readiness alone does not record exercise completion");
            completionCallback(store)();
        }
        assert.equal(selectPathwayNode(store.getState(), pageId + 1).state, "available");
        store.getState().navigatePage(pageId + 1);
    }
    assert.deepEqual(source.getHistory().entries.filter(entry => entry.actionType === "page_complete").map(entry => entry.page_id), [...completionPages]);
});

test("repeated mixed references to the same exercise have independent completion", () => {
    const bpe = visualisation("tokenization");
    const exercise: Story["pages"][number] = {
        page_type: "mixed",
        static_page: { page_type: "static", text: "Practice", path: "" },
        dynamic_page: { page_type: "reference", reference_type: "visualisation", path: "nlp/tokenization.json", pages: [0] },
    };
    const expanded = unrollStory({
        name: "repeat", display_name: "Repeated practice",
        pages: [exercise, exercise, { page_type: "static", text: "Done", path: "" }],
        transitions: [
            { from: 0, to: 1, condition: { condition_type: "Completed" } },
            { from: 1, to: 2, condition: { condition_type: "Completed" } },
        ],
    }, { stories: {}, visualisations: { tokenization: bpe } });
    const { store, source } = session(expanded);
    const firstComplete = completionCallback(store);
    firstComplete();
    store.getState().navigatePage(1);
    firstComplete();
    assert.equal(selectPathwayNode(store.getState(), 2).state, "locked");
    completionCallback(store)();
    assert.equal(selectPathwayNode(store.getState(), 2).state, "available");
    assert.deepEqual(source.getHistory().entries.filter(entry => entry.actionType === "page_complete").map(entry => entry.page_id), [0, 1]);
});

test("completion conditions follow remapped transitions inside a multi-page reference", () => {
    const bpe = visualisation("tokenization");
    const expanded = unrollStory({
        name: "offset", display_name: "Offset practice",
        pages: [
            { page_type: "static", text: "Intro", path: "" },
            { page_type: "reference", reference_type: "visualisation", path: "nlp/tokenization.json", pages: [0, 1] },
        ],
        transitions: [{ from: 0, to: 1, condition: { condition_type: "Bypass" } }],
    }, { stories: {}, visualisations: { tokenization: bpe } });
    assert.ok(expanded.transitions.some(edge => edge.from === 1 && edge.to === 2 && edge.condition.condition_type === "Completed"));
    const { store } = session(expanded);
    store.getState().navigatePage(1);
    assert.equal(selectPathwayNode(store.getState(), 2).state, "locked");
    completionCallback(store)();
    assert.equal(selectPathwayNode(store.getState(), 2).state, "available");
});

test("store actions enforce page and subpage gates and record the traversed transition", () => {
    const { store, source } = session();
    store.getState().start();
    assert.equal(source.getHistory().entries.length, 1, "Strict Mode setup must not duplicate the initial visit");
    store.getState().navigatePage(2);
    store.getState().navigatePage(1);
    store.getState().navigateSubpage(0, 1);
    assert.equal(store.getState().currentPageId, 0);
    assert.equal(store.getState().subpageIndex, 0);
    source.recordAction({ actionType: "page_complete", page_id: 0, timestamp: 1001 });
    assert.equal(canAdvanceSubpage(store.getState()), true);
    assert.equal(selectPathwayNode(store.getState(), 1).state, "locked", "Completion history does not bypass the subpage exit gate");
    completeSubpages(store);
    assert.equal(selectPathwayNode(store.getState(), 1).state, "available");
    store.getState().navigatePage(1);
    assert.equal(store.getState().currentPageId, 1);
    assert.deepEqual([...store.getState().visitedPages], [0, 1]);
    assert.deepEqual([...store.getState().traversed], ["0-1-0"]);
    assert.deepEqual(source.getHistory().path, [0]);
    assert.equal(source.getHistory().entries.at(-1)?.page_id, 1);
});

test("review actions preserve partial completion and completed pages stay unlocked while reviewing", () => {
    const { store } = session();
    store.getState().markSubpageReady(0, 0);
    store.getState().navigateSubpage(0, 1);
    store.getState().markSubpageReady(0, 1);
    store.getState().navigateSubpage(0, 2);
    const completed = store.getState().progressByPage[0].completed;
    store.getState().navigateSubpage(0, 0);
    assert.strictEqual(store.getState().progressByPage[0].completed, completed);
    assert.equal(store.getState().subpageIndex, 0);
    store.getState().navigateSubpage(0, 1);
    store.getState().navigateSubpage(0, 2);
    store.getState().markSubpageReady(0, 2);
    completionCallback(store)();
    store.getState().navigateSubpage(0, 0);
    assert.equal(canExitPage(store.getState()), true);
    assert.equal(selectPathwayNode(store.getState(), 1).state, "available");
    assert.deepEqual(store.getState().progressByPage[0].completed, [0, 1, 2]);
});

test("reviewing an inactive node preserves progress; explicit replay resets presentation only", () => {
    const { store, source } = session();
    completeSubpages(store);
    completionCallback(store)();
    store.getState().navigatePage(1);
    const progress = store.getState().progressByPage[0].completed;
    const traversed = store.getState().traversed;
    store.getState().navigateSubpage(0, 1);
    assert.equal(store.getState().currentPageId, 0);
    assert.equal(store.getState().subpageIndex, 1);
    assert.strictEqual(store.getState().progressByPage[0].completed, progress);
    const history = source.getHistory();
    const replayKey = store.getState().replayKey;
    store.getState().replayPage(0);
    assert.deepEqual(store.getState().progressByPage[0], { index: 0, completed: [] });
    assert.equal(store.getState().replayKey, replayKey + 1);
    assert.strictEqual(source.getHistory(), history);
    assert.strictEqual(store.getState().traversed, traversed);
    assert.equal(canAdvanceSubpage(store.getState()), true, "Historical completion survives replay");
});

test("navigation checks fresh wait time and history rather than a stale rendered snapshot", () => {
    const config = definition();
    config.pages = config.pages.slice(1);
    config.transitions = [{ from: 0, to: 1, condition: { condition_type: "Wait", wait: 2 } }];
    const { store, advanceClock } = session(config);
    assert.equal(transitionAvailable(store.getState(), config.transitions[0]), false);
    const layout = store.getState().layout;
    advanceClock(2000);
    store.getState().refreshTime();
    assert.equal(transitionAvailable(store.getState(), config.transitions[0]), false);
    advanceClock(4000);
    store.getState().navigatePage(1);
    assert.equal(store.getState().currentPageId, 1);
    assert.strictEqual(store.getState().layout, layout);
});

test("late readiness callbacks, locked destinations, and premature replay cannot change progress", () => {
    const { store } = session();
    store.getState().markSubpageReady(1, 0);
    store.getState().markSubpageReady(0, 1);
    store.getState().navigateSubpage(2, 0);
    store.getState().replayPage(0);
    assert.deepEqual(store.getState().progressByPage, {});
    assert.equal(store.getState().currentPageId, 0);
    assert.equal(store.getState().replayKey, 0);
});

test("resolved config updates preserve progress and stale title responses are ignored", () => {
    const config = definition();
    const { store } = session(config);
    store.getState().markSubpageReady(0, 0);
    const progress = store.getState().progressByPage;
    const resolved = { ...config, pages: [...config.pages], transitions: [...config.transitions] };
    store.getState().setDefinition(resolved);
    assert.strictEqual(store.getState().progressByPage, progress);
    store.getState().setTitles(config.pages, ["Stale"]);
    assert.equal(store.getState().titles[0], "Exercise");
    store.getState().setTitles(resolved.pages, ["Resolved", "Next", "Last"]);
    assert.equal(selectPathwayNode(store.getState(), 0).title, "Resolved");
});

test("each activity gets isolated state and keyboard focus follows layout order without navigating", () => {
    const { store: first } = session();
    first.getState().markSubpageReady(0, 0);
    const { store: second } = session();
    assert.deepEqual(second.getState().progressByPage, {});
    assert.notStrictEqual(first.getState().visitedPages, second.getState().visitedPages);
    first.getState().moveFocus(0, "End");
    assert.equal(first.getState().focusRequest?.pageId, 2);
    first.getState().moveFocus(2, "Home");
    assert.equal(first.getState().focusRequest?.pageId, 0);
    assert.equal(first.getState().focusRequest?.serial, 2);
    assert.equal(first.getState().currentPageId, 0);
    assert.equal(second.getState().focusRequest, null);
});

test("opening the same common-store session preserves progress and starts its history only once", () => {
    const { store, source } = session();
    const config = definition();
    const before = source.getHistory().entries.length;
    store.getState().openSession("story:first:mount-1", config, source);
    store.getState().start();
    store.getState().markSubpageReady(0, 0, "story:first:mount-1");
    const progress = store.getState().progressByPage;
    store.getState().openSession("story:first:mount-1", { ...config, pages: [...config.pages] }, source);
    store.getState().start();
    assert.strictEqual(store.getState().progressByPage, progress);
    assert.equal(source.getHistory().entries.length, before + 1);
});

test("changing common-store sessions resets progress, replaces the history source, and ignores old readiness callbacks", () => {
    const first = session();
    first.unsubscribe();
    const store = first.store;
    store.getState().openSession("story:first:mount-1", definition(), first.source);
    store.getState().markSubpageReady(0, 0, "story:first:mount-1");
    store.getState().moveFocus(0, "End");
    const next = session();
    store.getState().openSession("visualisation:second:mount-2", definition(), next.source);
    assert.deepEqual(store.getState().progressByPage, {});
    assert.deepEqual([...store.getState().visitedPages], [0]);
    assert.equal(store.getState().traversed.size, 0);
    assert.equal(store.getState().focusRequest, null);
    store.getState().markSubpageReady(0, 0, "story:first:mount-1");
    assert.deepEqual(store.getState().progressByPage, {});
    store.getState().markSubpageReady(0, 0, "visualisation:second:mount-2");
    assert.deepEqual(store.getState().progressByPage[0].completed, [0]);
    completeSubpages(store);
    first.source.recordAction({ actionType: "page_complete", page_id: 0, timestamp: 3000 });
    store.getState().navigatePage(1);
    assert.equal(store.getState().currentPageId, 0, "The old session's completion cannot unlock the new session");
    next.source.recordAction({ actionType: "page_complete", page_id: 0, timestamp: 3001 });
    store.getState().navigatePage(1);
    assert.equal(store.getState().currentPageId, 1);
});

test("Zustand drag selection is isolated by surface and removed surfaces ignore late events", () => {
    const store = useDragSelectionStore;
    store.setState(store.getInitialState(), true);
    store.getState().registerSurface("left");
    store.getState().registerSurface("right");
    store.getState().select("left", "flower-1");
    assert.equal(store.getState().selections.left, "flower-1");
    assert.equal(store.getState().selections.right, null);
    store.getState().select("right", "flower-2");
    store.getState().select("left", null);
    assert.equal(store.getState().selections.right, "flower-2");
    store.getState().removeSurface("left");
    store.getState().select("left", "stale-flower");
    assert.equal(Object.hasOwn(store.getState().selections, "left"), false);
    store.getState().registerSurface("left");
    assert.equal(store.getState().selections.left, null);
    assert.equal(store.getState().selections.right, "flower-2");
    store.setState(store.getInitialState(), true);
});
