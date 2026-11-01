import assert from "node:assert/strict";
import { test } from "node:test";
import { createTourStore } from "../src/store/tourStore.ts";
import { findTour, visualisationTours } from "../src/components/tours/tourDefinitions.ts";
import type { TourAction } from "../src/components/tours/tourDefinitions.ts";
import { readFileSync } from "node:fs";

const tour = visualisationTours["traditional_ml/linear_regression/Linear Regression Step"];
const start = () => {
    const store = createTourStore();
    store.getState().bind("page-1", tour);
    store.getState().start();
    return store;
};

test("only the five supported standalone pages have tours; the same story pages never do", () => {
    assert.equal(Object.keys(visualisationTours).length, 5);
    for (const [key, expected] of Object.entries(visualisationTours)) {
        const [category, visualisation, page] = key.split("/");
        assert.equal(findTour("visualisation", category, visualisation, page), expected);
        assert.equal(findTour("story", category, visualisation, page), undefined);
        const config = JSON.parse(readFileSync(new URL(`../public/config/visual/${category}/${visualisation}.json`, import.meta.url), "utf8"));
        assert.ok(config.pages.some((entry: { name?: string }) => entry.name === page), `Tour ${key} must resolve to a configured page`);
    }
    assert.equal(findTour("visualisation", "traditional_ml", "svm", "SVM Train"), undefined);
    assert.equal(findTour("visualisation", "nlp", "regex", "Regex Playground"), undefined);
});

const workflows: Record<string, { fresh: TourAction[]; existing: TourAction[] }> = {
    "decision-tree": { fresh: ["node", "feature", "threshold", "split"], existing: ["threshold", "split"] },
    kmeans: { fresh: ["parameters", "place", "centroids", "run-step", "resolve-step"], existing: ["run-step", "resolve-step"] },
    "linear-step": { fresh: ["parameters", "run-step", "resolve-step"], existing: ["run-step", "resolve-step"] },
    "linear-train": { fresh: ["train", "line"], existing: ["train", "line"] },
    "svm-step": { fresh: ["parameters", "run-step", "resolve-step"], existing: ["run-step", "resolve-step"] },
};

for (const definition of Object.values(visualisationTours)) {
    for (const mode of ["fresh", "existing"] as const) {
        test(`${definition.id}: ${mode} state follows the required successful interactions`, () => {
            const store = createTourStore();
            store.getState().bind("activity", definition);
            store.getState().start();
            const actions = [...workflows[definition.id][mode]];
            for (let guard = 0; store.getState().running && guard < 30; guard++) {
                if (mode === "existing") store.getState().skipSetup({ data: true, node: true, feature: true, placing: true, centroids: true });
                const state = store.getState();
                const action = state.tour!.steps[state.step].action;
                if (!action) { state.next(); continue; }
                assert.equal(action, actions.shift());
                const ticket = state.capture(action);
                state.complete(ticket, false);
                assert.equal(store.getState().step, state.step, "A failed interaction remains retryable");
                state.complete(store.getState().capture(action), true);
            }
            assert.deepEqual(actions, []);
            assert.equal(store.getState().running, false);
        });
    }
}

test("tours do not run until started and cannot skip an action with Next", () => {
    const store = createTourStore();
    store.getState().bind("page-1", tour);
    assert.equal(store.getState().running, false);
    assert.equal(store.getState().capture("parameters"), null);
    store.getState().start();
    store.getState().next();
    assert.equal(store.getState().step, 0);
    store.getState().complete(store.getState().capture("train"), true);
    assert.equal(store.getState().step, 0);
});

test("failed requests remain on their action and successful retries advance once", () => {
    const store = start();
    const ticket = store.getState().capture("parameters");
    store.getState().complete(ticket, false);
    assert.equal(store.getState().step, 0);
    assert.ok(store.getState().message);
    store.getState().complete(store.getState().capture("parameters"), true);
    assert.equal(store.getState().step, 1);
    assert.equal(store.getState().message, "");
    store.getState().complete(ticket, true);
    assert.equal(store.getState().step, 1);
});

test("existing data skips setup but a pre-existing step result cannot satisfy a fresh run", () => {
    const store = start();
    const oldParameters = store.getState().capture("parameters");
    store.getState().skipSetup({ data: true });
    assert.equal(store.getState().step, 1);
    store.getState().next();
    store.getState().next();
    assert.equal(store.getState().step, 3);
    store.getState().skipSetup({ data: true });
    store.getState().complete(oldParameters, true);
    assert.equal(store.getState().step, 3);
    store.getState().complete(store.getState().capture("run-step"), true);
    assert.equal(store.getState().step, 4);
    store.getState().next();
    assert.equal(store.getState().step, 4);
    store.getState().complete(store.getState().capture("resolve-step"), true);
    assert.equal(store.getState().step, 5);
    store.getState().next();
    assert.equal(store.getState().running, false);
});

test("Back, replay, and closing reject callbacks from the previous step attempt", () => {
    const store = start();
    const ticket = store.getState().capture("parameters");
    store.getState().complete(ticket, true);
    store.getState().back();
    store.getState().skipSetup({ data: true });
    assert.equal(store.getState().step, 0, "Back must let the learner review setup even when data is already available");
    store.getState().complete(ticket, true);
    assert.equal(store.getState().step, 0);
    const retry = store.getState().capture("parameters");
    store.getState().start();
    store.getState().complete(retry, true);
    assert.equal(store.getState().step, 0);
    const latest = store.getState().capture("parameters");
    store.getState().stop();
    store.getState().complete(latest, true);
    assert.equal(store.getState().running, false);
    assert.equal(store.getState().step, 0);
});

test("page and mode changes cancel tours and reject old-page responses, even after returning", () => {
    const store = start();
    const ticket = store.getState().capture("parameters");
    store.getState().bind("story-page", undefined);
    assert.equal(store.getState().running, false);
    assert.equal(store.getState().tour, null);
    store.getState().start();
    assert.equal(store.getState().running, false);
    store.getState().bind("page-1", tour);
    store.getState().start();
    store.getState().complete(ticket, true);
    assert.equal(store.getState().step, 0);
    store.getState().unbind("old-page");
    assert.equal(store.getState().running, true);
    store.getState().unbind("page-1");
    assert.equal(store.getState().scope, null);
    assert.equal(store.getState().running, false);
});

test("reviewing ready setup can continue without replaying actions, but incomplete setup stays gated", () => {
    const store = start();
    store.getState().skipSetup({ data: true });
    store.getState().back();
    store.getState().skipSetup({ data: false });
    store.getState().next();
    assert.equal(store.getState().step, 0);
    store.getState().skipSetup({ data: true });
    assert.equal(store.getState().step, 0);
    assert.equal(store.getState().canContinue, true);
    store.getState().next();
    assert.equal(store.getState().step, 1);
    assert.equal(store.getState().canContinue, false);
});
