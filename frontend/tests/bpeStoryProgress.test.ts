import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceStoryProgress, initialStoryProgress, pairKey, readCountAnswers } from "../src/pages/nlp/tokenization/bpe/storyProgress.ts";

test("every round requires correct counts before a correct merge can advance it", () => {
    let progress = initialStoryProgress();
    const apply = (type: "counts_checked" | "merge_checked", correct: boolean) => {
        progress = advanceStoryProgress(progress, { type, correct }, 2);
    };
    apply("merge_checked", true);
    apply("counts_checked", false);
    assert.deepEqual(progress, { round: 0, stage: "count" });
    apply("counts_checked", true);
    apply("merge_checked", false);
    assert.deepEqual(progress, { round: 0, stage: "merge" });
    apply("merge_checked", true);
    assert.deepEqual(progress, { round: 1, stage: "count" });
    apply("merge_checked", true);
    assert.deepEqual(progress, { round: 1, stage: "count" }, "A new round needs a fresh count check");
    apply("counts_checked", true);
    apply("merge_checked", true);
    assert.deepEqual(progress, { round: 2, stage: "complete" });
    apply("merge_checked", true);
    assert.deepEqual(progress, { round: 2, stage: "complete" }, "Completed exercises cannot advance again");
});

test("editing verified counts relocks merging until counts are checked again", () => {
    const verified = advanceStoryProgress(initialStoryProgress(), { type: "counts_checked", correct: true }, 1);
    const editing = advanceStoryProgress(verified, { type: "edit_counts" }, 1);
    assert.equal(editing.stage, "count");
    assert.deepEqual(advanceStoryProgress(editing, { type: "merge_checked", correct: true }, 1), editing);
    const rechecked = advanceStoryProgress(editing, { type: "counts_checked", correct: true }, 1);
    assert.equal(advanceStoryProgress(rechecked, { type: "merge_checked", correct: true }, 1).stage, "complete");
});

test("count submission rejects missing, negative, fractional, and non-finite answers", () => {
    const pair = { left: "l", right: "o" };
    assert.equal(readCountAnswers([], {}), null);
    assert.equal(readCountAnswers([pair], {}), null);
    for (const value of ["", " ", "-1", "1.5", "Infinity", "not a number", "9007199254740992"]) {
        assert.equal(readCountAnswers([pair], { [pairKey(pair)]: value }), null, value);
    }
    assert.deepEqual(readCountAnswers([pair], { [pairKey(pair)]: "0" }), [{ ...pair, count: 0 }]);
    assert.deepEqual(readCountAnswers([pair], { [pairKey(pair)]: "15" }), [{ ...pair, count: 15 }]);
});

test("pair counts keep token boundaries distinct and require every candidate answer", () => {
    const pairs = [{ left: "a-b", right: "c" }, { left: "a", right: "b-c" }];
    assert.notEqual(pairKey(pairs[0]), pairKey(pairs[1]));
    const drafts = { [pairKey(pairs[0])]: "4", [pairKey(pairs[1])]: "2" };
    assert.deepEqual(readCountAnswers(pairs, drafts), [{ ...pairs[0], count: 4 }, { ...pairs[1], count: 2 }]);
    assert.equal(readCountAnswers(pairs, { [pairKey(pairs[0])]: "4" }), null);
});
