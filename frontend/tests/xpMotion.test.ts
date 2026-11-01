import assert from "node:assert/strict";
import { test } from "node:test";
import { headerXpDisplay, xpFlightPath, xpMeterFrames } from "../src/lib/xpMotion.ts";
import type { XpTransfer } from "../src/store/progressStore.ts";

test("the header waits for arrival while the saved XP is already available", () => {
    const transfer: XpTransfer = { id: 1, phase: "flight", storyId: "story", pageId: "page", taskId: "task", xp: 20, before: 90, after: 110, perLevel: 100 };
    assert.deepEqual(headerXpDisplay(110, 100, transfer), { xp: 90, level: 1, current: 90, required: 100 });
    assert.deepEqual(headerXpDisplay(110, 100, { ...transfer, phase: "fill" }), { xp: 110, level: 2, current: 10, required: 100 });
    assert.deepEqual(headerXpDisplay(110, 100), { xp: 110, level: 2, current: 10, required: 100 });
    assert.equal(headerXpDisplay(0, 100, transfer).xp, 0, "Presentation cannot invent XP after a progress reset");
});

test("normal task XP fills forward and level-up XP reaches full before resetting", () => {
    assert.deepEqual(xpMeterFrames(15, 30, 100).map(frame => frame.width), ["15%", "30%"]);
    assert.deepEqual(xpMeterFrames(90, 110, 100).map(frame => frame.width), ["90%", "100%", "100%", "0%", "10%"]);
    assert.equal(xpMeterFrames(90, 100, 100).at(-1)!.width, "0%");
    for (const [before, after] of [[0, 15], [90, 110], [90, 350], [90, 5000]]) {
        const frames = xpMeterFrames(before, after, 100);
        assert.ok(frames.length <= 11, "Large rewards must not play dozens of full-bar loops");
        assert.ok(frames.every((frame, index) => frame.offset >= 0 && frame.offset <= 1 && (index === 0 || frame.offset >= frames[index - 1].offset)));
        for (let index = 1; index < frames.length; index++) {
            if (parseFloat(frames[index].width) < parseFloat(frames[index - 1].width)) assert.equal(frames[index - 1].easing, "steps(1, end)", "Level rollover resets instantly instead of draining backwards");
        }
    }
});

test("the curved XP path reaches the meter and stays inside small viewports", () => {
    const path = xpFlightPath({ x: 1000, y: 600 }, { x: 1000, y: 60 }, { width: 1120, height: 700 });
    assert.deepEqual(path[0], { x: 1000, y: 600, offset: 0 });
    assert.deepEqual(path.at(-1), { x: 1000, y: 60, offset: 1 });
    assert.ok(path.some(point => point.x < 1000), "The token follows an arc rather than a straight line");
    for (const viewport of [{ width: 320, height: 300 }, { width: 1920, height: 900 }]) {
        const points = xpFlightPath({ x: viewport.width, y: viewport.height }, { x: viewport.width - 1, y: 0 }, viewport);
        assert.ok(points.every(point => point.x >= 48 && point.x <= viewport.width - 48 && point.y >= 24 && point.y <= viewport.height - 24));
    }
});
