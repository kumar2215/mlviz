import { useEffect, type CSSProperties } from "react";
import { Sparkles, X } from "lucide-react";
import { useProgress } from "@/store/useProgress";

const confettiColors = ["#2563eb", "#38bdf8", "#22d3ee", "#fbbf24", "#f59e0b"];
const confetti = Array.from({ length: 48 }, (_, index) => {
    const direction = index * 2.39996;
    const spread = 120 + index * 43 % 260;
    return {
        backgroundColor: confettiColors[index % confettiColors.length],
        borderRadius: index % 3 === 0 ? "50%" : "2px",
        "--burst-x": `${Math.cos(direction) * spread}px`,
        "--burst-y": `${-120 - index * 31 % 220}px`,
        "--drift-x": `${Math.cos(direction) * spread * 1.5}px`,
        "--fall-y": `${320 + index % 7 * 35}px`,
        "--turn": `${(index % 2 ? 1 : -1) * (720 + index * 37)}deg`,
        animationDelay: `${index % 6 * 40}ms`,
        animationDuration: `${1600 + index % 7 * 140}ms`,
    } as CSSProperties;
});

export default function LevelUpCelebration() {
    const reward = useProgress(state => state.levelUp && !state.xpTransfers.some(transfer => transfer.id === state.levelUp!.id) ? state.levelUp : null);
    const dismiss = useProgress(state => state.dismissLevelUp);
    useEffect(() => {
        if (!reward) return;
        const timer = setTimeout(() => dismiss(reward.id), 5000);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            dismiss(reward.id);
        };
        document.addEventListener("keydown", onKeyDown, true);
        return () => { clearTimeout(timer); document.removeEventListener("keydown", onKeyDown, true); };
    }, [reward, dismiss]);

    return <>
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{reward ? `Level up! You reached level ${reward.level}. You earned ${reward.xp} XP.` : ""}</p>
        {reward && <div key={reward.id} className="pointer-events-none fixed inset-0 z-[70] grid place-items-center overflow-hidden p-5">
            <div aria-hidden="true" className="level-up-glow absolute left-1/2 top-1/2 size-80 rounded-full bg-cyan-300/30 blur-3xl" />
            <div aria-hidden="true" className="level-up-confetti absolute inset-0 overflow-hidden">{confetti.map((style, index) => <i key={index} className="level-up-confetti-piece" style={style} />)}</div>
            <section aria-label="Level-up celebration" className="level-up-card pointer-events-auto relative w-80 max-w-full max-h-[calc(100dvh-40px)] overflow-y-auto rounded-3xl border border-blue-200 bg-gradient-to-br from-white via-blue-50 to-cyan-50 p-7 text-center shadow-2xl">
                <button type="button" onClick={() => dismiss(reward.id)} aria-label="Dismiss level-up celebration" className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600"><X aria-hidden="true" className="size-4" /></button>
                <div className="mb-4 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-700"><Sparkles aria-hidden="true" className="size-5 text-amber-500" />Level up!</div>
                <img src={`${import.meta.env.BASE_URL}images/soccat-marker.svg`} alt="" aria-hidden="true" width="80" height="80" className="mx-auto mb-3 size-20" />
                <p className="!text-xs !font-semibold uppercase tracking-widest text-sky-700">Level</p>
                <p className="!text-7xl !font-black leading-none tracking-tight text-blue-800">{reward.level}</p>
                <p className="mt-4 !text-base !font-bold text-amber-700">+{reward.xp} XP</p>
                <p className="mt-2 !text-sm text-slate-600">{reward.level - reward.previousLevel > 1 ? `You climbed ${reward.level - reward.previousLevel} levels!` : "A new level of curiosity unlocked."}</p>
            </section>
        </div>}
    </>;
}
