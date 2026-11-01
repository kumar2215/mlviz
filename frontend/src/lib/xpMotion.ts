import { levelProgress } from "./storyProgress.ts";
import type { XpTransfer } from "../store/progressStore.ts";

export interface XpPoint { x: number; y: number }

/** Only presentation waits for the flight; the saved XP is already awarded. */
export function headerXpDisplay(earned: number, perLevel: number, transfer?: XpTransfer) {
    const xp = transfer ? Math.min(earned, transfer.phase === "flight" ? transfer.before : transfer.after) : earned;
    return { xp, ...levelProgress(xp, perLevel) };
}

export function xpFlightPath(start: XpPoint, end: XpPoint, viewport: { width: number; height: number }) {
    const clamp = (value: number, limit: number, margin: number) => Math.max(Math.min(margin, limit / 2), Math.min(limit - margin, value));
    const fit = (point: XpPoint) => ({ x: clamp(point.x, viewport.width, 48), y: clamp(point.y, viewport.height, 24) });
    const from = fit(start), to = fit(end);
    const control = fit({ x: (from.x + to.x) / 2 - 100, y: Math.min(from.y, to.y) - 120 });
    return Array.from({ length: 13 }, (_, index) => {
        const t = index / 12;
        return { x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * control.x + t ** 2 * to.x,
            y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * control.y + t ** 2 * to.y, offset: t };
    });
}

/** Fill to each level boundary before resetting, rather than animating the bar backwards. */
export function xpMeterFrames(before: number, after: number, perLevel: number) {
    const start = levelProgress(before, perLevel), end = levelProgress(after, perLevel);
    const crossed = Math.min(3, Math.max(0, end.level - start.level));
    const frames = [{ width: `${start.current / start.required * 100}%`, offset: 0, easing: "ease-out" }];
    for (let index = 0; index < crossed; index++) {
        frames.push({ width: "100%", offset: (index + 0.78) / (crossed + 1), easing: "linear" },
            { width: "100%", offset: (index + 0.98) / (crossed + 1), easing: "steps(1, end)" },
            { width: "0%", offset: (index + 1) / (crossed + 1), easing: "ease-out" });
    }
    frames.push({ width: `${end.current / end.required * 100}%`, offset: 1, easing: "ease-out" });
    return frames;
}
