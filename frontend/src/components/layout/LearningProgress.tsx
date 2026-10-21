import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/store/useProgress";
import { activeBucket } from "@/store/progressStore";
import useLearningSummary from "@/hooks/useLearningSummary";

export function LearnerSummary({ compact = false }: { compact?: boolean }) {
    const { xp, level, current, required } = useLearningSummary();
    return <div className={`rounded-xl border border-amber-200 bg-amber-50 text-amber-950 ${compact ? "min-w-36 px-3 py-1.5" : "space-y-2 p-4"}`} aria-label={`Level ${level}, ${xp} XP`}>
        <div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-1.5 font-semibold"><Sparkles aria-hidden="true" className="size-4" />{xp} XP</span><span>Level {level}</span></div>
        <div role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={required} aria-valuenow={current} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-200"><div className="h-full rounded-full bg-amber-600" style={{ width: `${current / required * 100}%` }} /></div>
        {!compact && <p className="text-xs">{current} / {required} XP toward Level {level + 1}</p>}
    </div>;
}

export function LearningSaveStatus({ className = "" }: { className?: string }) {
    const storageError = useProgress(state => state.storageError);
    const syncError = useProgress(state => state.syncError);
    const syncing = useProgress(state => state.syncing);
    const remoteReady = useProgress(state => state.remoteReady);
    const owner = useProgress(state => state.owner);
    const pending = useProgress(state => activeBucket(state).pending.length);
    const retry = useProgress(state => state.retry);
    const error = storageError || syncError;
    if (!owner && !error) return null;
    return <div className={`space-y-2 text-xs leading-relaxed ${className}`}>
        <p role={error ? "alert" : undefined} className={error ? "text-amber-900" : "text-blue-900"}>{error || (!remoteReady ? "Restoring account progress…" : syncing || pending ? "Saved on this device · syncing with your account…" : "Progress saved on this device and synced with your account.")}</p>
        {error && <Button type="button" variant="outline" size="sm" onClick={retry}>Retry saving progress</Button>}
    </div>;
}

export function RewardNotice() {
    const notice = useProgress(state => state.notice);
    const dismiss = useProgress(state => state.dismissNotice);
    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(dismiss, 6000);
        return () => clearTimeout(timer);
    }, [notice, dismiss]);
    return <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2">
        {notice && <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-950 shadow-lg"><Sparkles aria-hidden="true" className="size-5 shrink-0" /><span>{notice.text}</span><button type="button" onClick={dismiss} aria-label="Dismiss XP reward" className="rounded p-1 focus-visible:outline-2"><X className="size-4" /></button></div>}
    </div>;
}
