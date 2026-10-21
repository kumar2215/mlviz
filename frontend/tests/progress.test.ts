import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadProgressCatalog } from "../scripts/progress-catalog.mjs";
import { activeBucket, createProgressStore, PROGRESS_STORAGE_KEY } from "../src/store/progressStore.ts";
import { allowedMilestones, emptyProgress, levelProgress, mergeProgress, readProgress, storyXp, taskKey, validateStoryProgressConfig, type StoryProgress } from "../src/lib/storyProgress.ts";
import { createTaskCompletion } from "../src/lib/taskCompletion.ts";
import { startProgressSync, type ProgressService } from "../src/lib/progressSync.ts";
import { createPathwayStore, selectPathwayNode, type PathwayHistorySource } from "../src/store/pathwayStore.ts";
import { applyLearnedRules, restoreStoryProgress } from "../src/pages/nlp/tokenization/bpe/storyProgress.ts";
import type Story from "../src/types/story.ts";

function memory(raw: string | null = null) {
    let value = raw, failing = false;
    return { getItem: () => value, setItem: (_key: string, next: string) => { if (failing) throw new Error("Quota exceeded"); value = next; }, fail: (next: boolean) => { failing = next; } };
}
const setup = () => { const storage = memory(); return { storage, store: createProgressStore(storage, { clientId: "test-client", now: () => 1000 }) }; };
const sample = (milestones: string[], at = 1000, page = "sort-flowers", client = "test-client"): StoryProgress => ({ version: 1, milestones: [...new Set(milestones)].sort(), checkpoint: { page, step: "", at, client } });
function record(store: ReturnType<typeof createProgressStore>, task: string) {
    const state = store.getState();
    state.update("decision_tree", [`visit:sort-flowers`, taskKey("sort-flowers", task)], "sort-flowers", "", state.epoch);
}
const catalog = loadProgressCatalog() as Story[];
const tree = catalog.find(story => story.name === "decision_tree")!;
const text = catalog.find(story => story.name === "text_preprocessing")!;

test("resolved configs contain only explicitly scored challenges, with consistent story totals", () => {
    assert.equal(storyXp(tree, undefined).total, 165);
    assert.equal(storyXp(text, undefined).total, 240);
    assert.equal(tree.pages.find(page => page.id === "build-tree")?.xp_tasks?.[0].xp, 50);
    assert.ok(text.pages.find(page => page.id === "regex-challenges")?.xp_tasks?.every(task => task.subpage_id));
    for (const story of catalog) {
        validateStoryProgressConfig(story);
        assert.equal(new Set(story.pages.map(page => page.id)).size, story.pages.length);
        for (const page of story.pages.filter(page => page.page_type === "static" || ["porter-explore", "final-prediction", "regex-playground"].includes(page.id!))) assert.equal(page.xp_tasks?.length ?? 0, 0);
    }
    execFileSync(process.execPath, ["--experimental-strip-types", "scripts/generate-progress-rules.mjs", "--check"], { cwd: new URL("../", import.meta.url), stdio: "pipe" });
});

test("task IDs, not mutable labels or page positions, determine XP and config rebalancing", () => {
    const progress = sample([taskKey("sort-flowers", "root-sort")]);
    assert.equal(storyXp(tree, progress).earned, 15);
    const changed = structuredClone(tree);
    changed.pages.reverse();
    changed.pages.find(page => page.id === "sort-flowers")!.xp_tasks![0] = { id: "root-sort", label: "Renamed task", xp: 70 };
    assert.equal(storyXp(changed, progress).earned, 70);
    changed.pages.find(page => page.id === "sort-flowers")!.xp_tasks![0].xp = 0;
    assert.equal(storyXp(changed, progress).earned, 0);
    assert.equal(storyXp(changed, progress).tasks, 6); // Retired zero-XP tasks retain sync IDs without blocking completion.
    assert.equal(levelProgress(405).level, 5);
    assert.deepEqual(levelProgress(100, 100), { level: 2, current: 0, required: 100 });
    assert.equal(levelProgress(100, 0).level, 2);
    const invalid = structuredClone(tree);
    invalid.pages[1].xp_tasks![0].xp = -1;
    assert.throws(() => validateStoryProgressConfig(invalid), /Invalid XP/);
    invalid.pages[1].xp_tasks![0].xp = 1;
    invalid.pages[1].xp_tasks!.push(invalid.pages[1].xp_tasks![0]);
    assert.throws(() => validateStoryProgressConfig(invalid), /Invalid XP/);
    invalid.pages[1].xp_tasks!.pop();
    invalid.pages[1].id = invalid.pages[0].id;
    assert.throws(() => validateStoryProgressConfig(invalid), /duplicate page/);
});

test("guest imports are durable, idempotent, and new guest batches merge into either existing or new accounts", () => {
    const { store, storage } = setup();
    record(store, "root-sort");
    store.getState().setOwner("alice");
    assert.equal(Object.keys(store.getState().data.guest.stories).length, 0);
    assert.equal(store.getState().data.imports["0"], "alice");
    const reloaded = createProgressStore(storage);
    reloaded.getState().setOwner("alice");
    assert.equal(storyXp(tree, activeBucket(reloaded.getState()).stories.decision_tree).earned, 15);
    reloaded.getState().setOwner(null);
    record(reloaded, "child-sort");
    reloaded.getState().setOwner("alice");
    assert.equal(storyXp(tree, activeBucket(reloaded.getState()).stories.decision_tree).earned, 30);
    reloaded.getState().setOwner(null);
    record(reloaded, "root-sort"); // A genuinely new guest batch can contain a task Alice already earned.
    reloaded.getState().setOwner("bob");
    assert.equal(storyXp(tree, activeBucket(reloaded.getState()).stories.decision_tree).earned, 15);
    assert.equal(storyXp(tree, reloaded.getState().data.accounts.alice.stories.decision_tree).earned, 30);
    assert.equal(reloaded.getState().data.guestGeneration, 3);
});

test("stale tabs cannot resurrect a consumed guest batch; late work stays with its claimed account", () => {
    const { store, storage } = setup();
    record(store, "root-sort");
    const oldTab = createProgressStore(memory(storage.getItem()), { clientId: "old-tab", now: () => 1001 });
    store.getState().setOwner("alice");
    record(oldTab, "child-sort");
    oldTab.getState().reconcileStorage(storage.getItem());
    oldTab.getState().setOwner("bob");
    assert.equal(activeBucket(oldTab.getState()).stories.decision_tree, undefined);
    assert.equal(storyXp(tree, oldTab.getState().data.accounts.alice.stories.decision_tree).earned, 30);
    oldTab.getState().setOwner(null);
    record(oldTab, "root-sort");
    oldTab.getState().setOwner("bob");
    assert.equal(storyXp(tree, activeBucket(oldTab.getState()).stories.decision_tree).earned, 15);
});

test("local corruption and quota errors are visible; failed imports do not consume guest progress", () => {
    const bad = memory('{"version":999}');
    const corrupted = createProgressStore(bad);
    assert.match(corrupted.getState().storageError!, /couldn't be read/);
    assert.equal(bad.getItem(), '{"version":999}');
    const { store, storage } = setup();
    record(store, "root-sort");
    storage.fail(true);
    store.getState().setOwner("alice");
    assert.ok(store.getState().data.guest.stories.decision_tree);
    assert.match(store.getState().storageError!, /couldn't be saved/);
    storage.fail(false);
    store.getState().retry();
    assert.equal(store.getState().storageError, null);
    assert.equal(Object.keys(store.getState().data.guest.stories).length, 0);
    assert.equal(storyXp(tree, activeBucket(store.getState()).stories.decision_tree).earned, 15);
    assert.match(createProgressStore(null).getState().storageError!, /unavailable/);
    assert.equal(readProgress({ ...emptyProgress(), milestones: [42] }), null);
    assert.equal(readProgress({ ...emptyProgress(), checkpoint: { page: "bad/path" } }), null);
});

test("merges preserve independent completions and use a deterministic latest checkpoint", () => {
    const a = sample(["task:sort-flowers:root-sort"], 1000, "sort-flowers", "a");
    const b = sample(["task:sort-flowers:child-sort"], 1000, "sort-flowers", "b");
    assert.deepEqual(mergeProgress(a, b), mergeProgress(b, a));
    assert.deepEqual(mergeProgress(a, mergeProgress(a, b)), mergeProgress(a, b));
    assert.equal(mergeProgress(a, b).checkpoint.client, "b");
    assert.equal(mergeProgress(a, sample([], 1001)).checkpoint.at, 1001);
    assert.equal(storyXp(tree, mergeProgress(a, b)).earned, 30);
});

function pathway(story = tree) {
    const source: PathwayHistorySource = { getHistory: () => ({ params: {}, entries: [], path: [] }), subscribe: () => () => {}, addPageVisit: () => {}, recordAction: () => {} };
    const path = createPathwayStore(story, source);
    path.getState().openSession("story-session", story, source);
    return path;
}
test("navigation readiness and visits award no XP; task callbacks reject duplicates, unknown tasks and stale attempts", () => {
    const { store } = setup();
    const path = pathway();
    path.getState().restoreProgress(sample(["visit:sort-flowers"], 1000));
    const state = path.getState();
    const handler = createTaskCompletion(path, store, tree, { pageId: state.currentPageId, subpageIndex: state.subpageIndex, sessionId: state.sessionId, replayKey: state.replayKey }, store.getState().epoch, { [tree.name]: tree });
    handler("continue-click");
    assert.equal(storyXp(tree, activeBucket(store.getState()).stories.decision_tree).earned, 0);
    handler("root-sort"); handler("root-sort");
    assert.equal(storyXp(tree, activeBucket(store.getState()).stories.decision_tree).earned, 15);
    assert.equal(store.getState().notice?.text, "+15 XP · Sort the root branches");
    path.setState({ replayKey: path.getState().replayKey + 1 });
    handler("child-sort");
    assert.equal(storyXp(tree, activeBucket(store.getState()).stories.decision_tree).earned, 15);
    store.getState().setOwner("bob");
    handler("child-sort");
    assert.equal(storyXp(tree, activeBucket(store.getState()).stories.decision_tree).earned, 15);
    assert.equal(store.getState().notice, null); // Imports and hydration never announce rewards.
});

test("changing account alone invalidates a task result, even when the story attempt is unchanged", () => {
    const { store } = setup();
    store.getState().setOwner("alice");
    const path = pathway();
    path.getState().restoreProgress(sample(["visit:sort-flowers"]));
    const state = path.getState();
    const handler = createTaskCompletion(path, store, tree, { pageId: state.currentPageId, subpageIndex: state.subpageIndex, sessionId: state.sessionId, replayKey: state.replayKey }, store.getState().epoch, { [tree.name]: tree });
    store.getState().setOwner("bob");
    handler("root-sort");
    assert.equal(activeBucket(store.getState()).stories.decision_tree, undefined);
    assert.equal(store.getState().notice, null);
});

test("subpage task IDs cannot earn XP from another step, and level-up feedback is emitted once", () => {
    const { store } = setup();
    const path = pathway();
    path.getState().restoreProgress({ ...sample(["visit:compare-splits"], 1000, "compare-splits"), checkpoint: { page: "compare-splits", step: "variables", at: 1000, client: "test" } });
    const state = path.getState();
    const handler = createTaskCompletion(path, store, tree, { pageId: state.currentPageId, subpageIndex: state.subpageIndex, sessionId: state.sessionId, replayKey: state.replayKey }, 0, { [tree.name]: tree });
    handler("thresholds");
    assert.equal(activeBucket(store.getState()).stories.decision_tree, undefined);
    handler("variables");
    assert.equal(storyXp(tree, activeBucket(store.getState()).stories.decision_tree).earned, 20);

    const fresh = setup().store;
    const scored = structuredClone(tree);
    scored.pages[1].xp_tasks![0].xp = 90; scored.pages[1].xp_tasks![1].xp = 20;
    const exercise = pathway(scored);
    exercise.getState().restoreProgress(sample(["visit:sort-flowers"]));
    const current = exercise.getState();
    const award = createTaskCompletion(exercise, fresh, scored, { pageId: 1, subpageIndex: 0, sessionId: current.sessionId, replayKey: current.replayKey }, 0, { [tree.name]: scored });
    award("root-sort"); award("child-sort");
    assert.match(fresh.getState().notice!.text, /Level 2 reached/);
    const notice = fresh.getState().notice;
    award("child-sort");
    assert.equal(fresh.getState().notice, notice);
});

test("checkpoint IDs survive page reordering; remote completion merges never move the active exercise", () => {
    const reordered = structuredClone(tree);
    [reordered.pages[1], reordered.pages[2]] = [reordered.pages[2], reordered.pages[1]];
    const path = pathway(reordered);
    path.getState().restoreProgress(sample(["visit:sort-flowers", "unlock:tree-parts"], 1000));
    assert.equal(path.getState().currentPageId, 2);
    assert.equal(selectPathwayNode(path.getState(), 1).state, "available");
    path.getState().mergeSavedProgress(sample(["visit:compare-splits", "unlock:build-tree", "step:compare-splits:variables"], 2000, "compare-splits"));
    assert.equal(path.getState().currentPageId, 2);
    assert.ok(path.getState().savedUnlocked.has(4));
    assert.deepEqual(path.getState().progressByPage[3].completed, [0]);
});

test("BPE checkpoints reconstruct completed rounds and count stages without persisting answer drafts", () => {
    assert.deepEqual(restoreStoryProgress(["round-1-count"], 2), { round: 0, stage: "merge" });
    assert.deepEqual(restoreStoryProgress(["round-1-count", "round-1-merge"], 2), { round: 1, stage: "count" });
    assert.deepEqual(restoreStoryProgress(["round-1-merge", "round-2-merge"], 2), { round: 2, stage: "complete" });
    assert.deepEqual(applyLearnedRules(["low"], [{ left: "l", right: "o" }, { left: "lo", right: "w" }]), [{ word: "low", tokens: ["low", "</w>"] }]);
});

async function waitFor(check: () => boolean) {
    for (let index = 0; index < 200; index++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
    assert.fail("Timed out waiting for progress sync");
}
test("offline writes persist, retry merges remote work, and acknowledged writes leave the pending queue", async () => {
    const { store, storage } = setup();
    record(store, "root-sort"); store.getState().setOwner("alice");
    let connected = false;
    let remote = sample([taskKey("sort-flowers", "child-sort")], 900);
    const service: ProgressService = {
        watch: (_uid, next, _error, ready) => { if (connected) next("decision_tree", remote); ready?.(); return () => {}; },
        merge: async (_uid, _story, value) => { if (!connected) throw new Error("offline"); remote = mergeProgress(value, remote); return remote; },
    };
    const stop = startProgressSync(store, service, 1);
    try {
        await waitFor(() => Boolean(store.getState().syncError));
        assert.deepEqual(activeBucket(createProgressStore(storage).getState()).stories, {});
        assert.deepEqual(store.getState().data.accounts.alice.pending, ["decision_tree"]);
        connected = true; store.getState().retry();
        await waitFor(() => activeBucket(store.getState()).pending.length === 0);
        assert.equal(storyXp(tree, remote).earned, 30);
        assert.equal(store.getState().notice, null);
        assert.equal(store.getState().syncError, null);
    } finally { stop(); }
});

test("old account responses and listeners cannot write into a newly selected account", async () => {
    const { store } = setup();
    record(store, "root-sort"); store.getState().setOwner("alice");
    let resolve: (value: StoryProgress) => void = () => {};
    let oldNext: (id: string, value: StoryProgress) => void = () => {};
    let started = false, stopped = 0;
    const service: ProgressService = {
        watch: (uid, next, _error, ready) => { if (uid === "alice") oldNext = next; ready?.(); return () => { stopped++; }; },
        merge: () => { started = true; return new Promise(done => { resolve = done; }); },
    };
    const stop = startProgressSync(store, service, 1);
    try {
        await waitFor(() => started);
        store.getState().setOwner("bob");
        const late = sample([taskKey("sort-flowers", "child-sort")], 5000);
        oldNext("decision_tree", late); resolve(late);
        await new Promise(done => setTimeout(done, 10));
        assert.equal(activeBucket(store.getState()).stories.decision_tree, undefined);
        assert.equal(stopped, 1);
        assert.equal(store.getState().data.accounts.alice.pending.length, 1);
    } finally { stop(); }
});

test("generated rule allowlists cover every configured task but contain no numeric XP counters", () => {
    const source = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
    for (const story of catalog) for (const key of allowedMilestones(story)) assert.ok(source.includes(JSON.stringify(key)), key);
    assert.ok(!source.includes("allow read: if true"));
    assert.ok(!JSON.stringify(sample([])).includes('"xp"'));
    assert.equal(PROGRESS_STORAGE_KEY, "mlviz.story-progress.v1");
});
