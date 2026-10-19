import assert from "node:assert/strict";
import { test } from "node:test";
import { configuredStories, configuredVisualisations } from "../src/utils/catalog.ts";
import type Config from "../src/types/config.ts";
import type Story from "../src/types/story.ts";
import type Visualisation from "../src/types/visualisation.ts";

const story = (name: string): Story => ({ name, display_name: name, pages: [], transitions: [] });
const visualisation = (name: string, category = "traditional_ml"): Visualisation => ({ ...story(name), category });
const config = (): Config => ({
    datasets: {},
    stories: ["decision_tree", "text_preprocessing"],
    categories: [
        { name: "ML", description: "", icon: "", config_path: "traditional_ml", files: ["svm.json", "decision_tree.json", "knn.json"] },
        { name: "NLP", description: "", icon: "", config_path: "nlp", files: ["regex.json", "porter.json"] },
    ],
});

test("story presentation follows config when responses finish in reverse order", async () => {
    const catalog: Record<string, Story> = {};
    const pending = new Map<string, (value: Story) => void>();
    const loading = Promise.all(config().stories.map(name => new Promise<Story>(resolve => {
        pending.set(name, resolve);
    }).then(value => { catalog[name] = value; })));
    pending.get("text_preprocessing")!(story("text_preprocessing"));
    await Promise.resolve();
    assert.deepEqual(configuredStories(config(), catalog).map(item => item.name), ["text_preprocessing"]);
    pending.get("decision_tree")!(story("decision_tree"));
    await loading;
    assert.deepEqual(Object.keys(catalog), ["text_preprocessing", "decision_tree"]);
    assert.deepEqual(configuredStories(config(), catalog).map(item => item.name), config().stories);
    assert.deepEqual(configuredStories({ ...config(), stories: [...config().stories].reverse() }, catalog).map(item => item.name), ["text_preprocessing", "decision_tree"]);
});

test("visualisation presentation follows category files regardless of insertion order", () => {
    const catalog = {
        porter: visualisation("porter", "nlp"), knn: visualisation("knn"),
        decision_tree: visualisation("decision_tree"), regex: visualisation("regex", "nlp"), svm: visualisation("svm"),
    };
    assert.deepEqual(configuredVisualisations(config(), catalog, "traditional_ml").map(item => item.name), ["svm", "decision_tree", "knn"]);
    assert.deepEqual(configuredVisualisations(config(), catalog, "nlp").map(item => item.name), ["regex", "porter"]);
    assert.deepEqual(Object.keys(catalog), ["porter", "knn", "decision_tree", "regex", "svm"], "Selecting a display order does not mutate the store");
});

test("lists omit unavailable and unconfigured entries and never include another category", () => {
    assert.deepEqual(configuredStories(config(), { extra: story("extra"), decision_tree: story("decision_tree") }).map(item => item.name), ["decision_tree"]);
    const catalog = { extra: visualisation("extra"), svm: visualisation("svm"), decision_tree: visualisation("decision_tree", "nlp") };
    assert.deepEqual(configuredVisualisations(config(), catalog, "traditional_ml").map(item => item.name), ["svm"]);
    assert.deepEqual(configuredStories(null, { decision_tree: story("decision_tree") }), []);
    assert.deepEqual(configuredVisualisations(null, catalog, "traditional_ml"), []);
    assert.deepEqual(configuredVisualisations(config(), catalog, "unknown"), []);
    assert.deepEqual(configuredVisualisations(config(), catalog, undefined), []);
});

test("config order also applies to numeric story names", () => {
    assert.deepEqual(configuredStories({ ...config(), stories: ["10", "2"] }, { "2": story("2"), "10": story("10") }).map(item => item.name), ["10", "2"]);
});
