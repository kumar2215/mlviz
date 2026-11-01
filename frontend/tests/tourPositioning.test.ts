import assert from "node:assert/strict";
import { test } from "node:test";
import { computePosition, flip, offset, shift, type Rect } from "@floating-ui/core";
import { TOUR_VIEWPORT_PADDING as padding, tourFloatingOptions } from "../src/components/tours/tourPositioning.ts";

async function position(target: Rect, viewport: Rect) {
    const width = Math.min(320, viewport.width - padding * 2);
    const height = Math.min(330, viewport.height - padding * 2);
    const result = await computePosition({}, {}, {
        placement: "bottom",
        strategy: tourFloatingOptions.strategy,
        middleware: [offset(30), flip(tourFloatingOptions.flipOptions || undefined), shift(tourFloatingOptions.shiftOptions)],
        platform: {
            getElementRects: () => ({ reference: target, floating: { x: 0, y: 0, width, height } }),
            getDimensions: () => ({ width, height }),
            getClippingRect: options => {
                assert.equal(options.strategy, "fixed");
                assert.equal(options.rootBoundary, "viewport");
                assert.deepEqual(options.boundary, []);
                return viewport;
            },
        },
    });
    const tolerance = 0.01;
    assert.ok(result.x >= viewport.x + padding - tolerance, `Bubble extends past the left edge: ${result.x}`);
    assert.ok(result.y >= viewport.y + padding - tolerance, `Bubble extends past the top edge: ${result.y}`);
    assert.ok(result.x + width <= viewport.x + viewport.width - padding + tolerance, "Bubble extends past the right edge");
    assert.ok(result.y + height <= viewport.y + viewport.height - padding + tolerance, "Bubble extends past the bottom edge");
    return result;
}

const viewport = { x: 0, y: 0, width: 1400, height: 900 };

test("a plot filling the viewport cannot push the bubble above or below the screen", async () => {
    await position({ x: 0, y: 80, width: 1400, height: 820 }, viewport);
});

test("bubbles stay within all four viewport edges", async () => {
    for (const target of [
        { x: 500, y: 0, width: 280, height: 60 },
        { x: 500, y: 880, width: 280, height: 20 },
        { x: 0, y: 400, width: 20, height: 80 },
        { x: 1380, y: 400, width: 20, height: 80 },
    ]) await position(target, viewport);
});

test("partly off-screen targets do not drag the bubble out of view", async () => {
    await position({ x: 400, y: -400, width: 280, height: 800 }, viewport);
    await position({ x: 400, y: 850, width: 280, height: 800 }, viewport);
});

test("short and narrow resized viewports keep the resized bubble and controls visible", async () => {
    const target = { x: 40, y: 0, width: 500, height: 900 };
    await position(target, { x: 0, y: 0, width: 768, height: 480 });
    await position(target, { x: 0, y: 0, width: 280, height: 220 });
});
