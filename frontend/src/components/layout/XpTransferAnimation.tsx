import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { progressStore, useProgress } from "@/store/useProgress";
import { taskKey } from "@/lib/storyProgress";
import { xpFlightPath, xpMeterFrames, type XpPoint } from "@/lib/xpMotion";

function visibleCenter(element: HTMLElement | null): XpPoint | null {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const panel = element.closest('[role="tabpanel"]')?.getBoundingClientRect();
    const left = Math.max(0, rect.left, panel?.left ?? 0);
    const top = Math.max(0, rect.top, panel?.top ?? 0);
    const right = Math.min(window.innerWidth, rect.right, panel?.right ?? window.innerWidth);
    const bottom = Math.min(window.innerHeight, rect.bottom, panel?.bottom ?? window.innerHeight);
    return right > left && bottom > top ? { x: (left + right) / 2, y: (top + bottom) / 2 } : null;
}

export default function XpTransferAnimation() {
    const transfer = useProgress(state => state.xpTransfers[0]);
    const id = transfer?.id;
    const { pathname } = useLocation();
    const badge = useRef<HTMLSpanElement>(null);
    const sparks = useRef<(HTMLSpanElement | null)[]>([]);

    useLayoutEffect(() => {
        const reward = progressStore.getState().xpTransfers[0];
        if (!reward || reward.id !== id) return;
        const finish = () => progressStore.getState().finishXpTransfer(reward.id);
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (motion.matches || document.hidden || reward.phase === "fill" || !badge.current || typeof badge.current.animate !== "function") { finish(); return; }
        const meter = document.querySelector<HTMLElement>("[data-xp-meter]");
        const fill = meter?.querySelector<HTMLElement>("[data-xp-meter-fill]");
        const task = Array.from(document.querySelectorAll<HTMLElement>("[data-xp-task]"))
            .find(element => element.dataset.xpStory === reward.storyId && element.dataset.xpTask === taskKey(reward.pageId, reward.taskId)) ?? null;
        let source = task;
        let start = visibleCenter(source);
        if (!start) { source = document.querySelector<HTMLElement>("[data-xp-tasks-tab]"); start = visibleCenter(source); }
        const end = visibleCenter(meter);
        if (!start || !end || !meter || !fill) { finish(); return; }
        const path = xpFlightPath(start, end, { width: window.innerWidth, height: window.innerHeight });
        const animations: Animation[] = [];
        let cancelled = false;
        const animate = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
            const animation = element.animate(frames, options);
            // Cancellation is normal on navigation, account changes, and reduced-motion changes.
            void animation.finished.catch(() => {});
            animations.push(animation);
            return animation;
        };
        const settle = () => {
            if (cancelled) return;
            cancelled = true;
            animations.forEach(animation => animation.cancel());
            finish();
        };
        const reduceMotion = () => { if (motion.matches) settle(); };
        const hide = () => { if (document.hidden) settle(); };
        window.addEventListener("resize", settle);
        motion.addEventListener("change", reduceMotion);
        document.addEventListener("visibilitychange", hide);
        const fly = async () => {
            try {
                if (source) animate(source.closest("li") ?? source, [{ filter: "brightness(1)" }, { filter: "brightness(1.15)" }, { filter: "brightness(1)" }], { duration: 300 });
                const frames = path.map(point => ({ offset: point.offset, opacity: point.offset === 1 ? 0 : 1,
                    transform: `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) scale(${1 - point.offset * 0.35})` }));
                const flight = animate(badge.current!, frames, { duration: 720, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "both" });
                sparks.current.forEach((spark, index) => {
                    if (spark) animate(spark, frames, { duration: 650, delay: index * 30, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "both" });
                });
                await flight.finished;
                if (cancelled) return;
                const fillFrames = xpMeterFrames(reward.before, reward.after, reward.perLevel);
                const levelsCrossed = Math.floor(reward.after / reward.perLevel) - Math.floor(reward.before / reward.perLevel);
                const filling = animate(fill, fillFrames, { duration: Math.min(1400, 550 + levelsCrossed * 200), fill: "both" });
                progressStore.getState().startXpFill(reward.id);
                animate(meter, [{ boxShadow: "0 0 0 0 #fbbf2400" }, { boxShadow: "0 0 0 6px #fbbf2470" }, { boxShadow: "0 0 0 0 #fbbf2400" }], { duration: 500 });
                await filling.finished;
            } catch { /* The XP is already saved; skip presentation if animation is unavailable. */ }
            if (!cancelled) finish();
        };
        void fly();
        return () => {
            cancelled = true;
            animations.forEach(animation => animation.cancel());
            window.removeEventListener("resize", settle);
            motion.removeEventListener("change", reduceMotion);
            document.removeEventListener("visibilitychange", hide);
        };
    }, [id, pathname]);

    return transfer ? <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[65] overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => <span key={index} ref={element => { sparks.current[index] = element; }} className={`absolute left-0 top-0 size-2 rounded-full opacity-0 ${index % 2 ? "bg-sky-400" : "bg-amber-400"}`} />)}
        <span ref={badge} className="absolute left-0 top-0 flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-bold text-amber-950 opacity-0 shadow-lg"><Sparkles className="size-4" />+{transfer.xp} XP</span>
    </div> : null;
}
