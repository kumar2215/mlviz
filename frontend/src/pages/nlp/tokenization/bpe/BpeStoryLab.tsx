import { useEffect, useRef, useState } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import PageLoading from "@/components/layout/PageLoading";
import { Button } from "@/components/ui/button";
import { checkBpeCounts, checkBpeMerge, loadBpeState, type BpePair, type BpeState } from "@/api/bpe";
import { useDataset } from "@/store/useDataset";
import type { BpeDataset } from "@/types/dataset";
import type { IndexPageProps } from "@/types/page";
import { actionClass, LabFrame, optionClass, Status } from "../../shared/LabFrame";
import BpeCorpusView from "./BpeCorpusView";
import { advanceStoryProgress, initialStoryProgress, pairKey, readCountAnswers, restoreStoryProgress } from "./storyProgress";

const countPrompt = "Count each candidate pair across the corpus, including the word frequencies.";

export default function BpeStoryLab({ narration, onComplete, onTaskComplete, completedTasks = [] }: Pick<IndexPageProps, "narration" | "onComplete" | "onTaskComplete" | "completedTasks">) {
    const restored = useRef(completedTasks).current;
    const activeDataset = useDataset(state => state.activeDataset);
    const [source, setSource] = useState<BpeDataset | null>(null);
    const [data, setData] = useState<BpeState | null>(null);
    const [progress, setProgress] = useState(initialStoryProgress);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [selected, setSelected] = useState<BpePair | null>(null);
    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState(countPrompt);
    const [loadError, setLoadError] = useState("");
    const [retry, setRetry] = useState(0);
    const attempt = useRef(0);

    useEffect(() => {
        const request = ++attempt.current;
        setSource(null); setData(null); setLoadError(""); setProgress(initialStoryProgress());
        setDrafts({}); setSelected(null); setFeedback(countPrompt); setPending(false);
        if (activeDataset?.type !== "predefined_bpe" && activeDataset?.type !== "custom_bpe") return;
        // Story exercises use their configured corpus, independently of playground drafts.
        loadBpeState(activeDataset).then(result => {
            if (request === attempt.current) {
                setSource(activeDataset); setData(result);
                const checkpoint = restoreStoryProgress(restored, result.rounds.length);
                setProgress(checkpoint);
                if (checkpoint.stage === "merge") {
                    setDrafts(Object.fromEntries(result.rounds[checkpoint.round].counts.map(pair => [pairKey(pair), String(pair.count)])));
                    setFeedback("Your counts were already verified. Choose the next merge.");
                } else if (checkpoint.stage === "complete") setFeedback("Training completed previously. Use Replay to practice again.");
            }
        }).catch(error => {
            if (request === attempt.current) setLoadError(error instanceof Error ? error.message : "Could not load the exercise.");
        });
        return () => { attempt.current++; };
    }, [activeDataset, retry, restored]);

    const current = data?.rounds[progress.round];
    const answers = readCountAnswers(current?.questions ?? [], drafts);
    const finished = progress.stage === "complete";
    const corpus = current?.before ?? data?.rounds[data.rounds.length - 1]?.after ?? data?.initial ?? [];

    const checkCounts = async () => {
        if (!source || !data || !answers || pending || progress.stage !== "count") return;
        const request = attempt.current;
        setPending(true);
        try {
            const result = await checkBpeCounts(source, progress.round, answers);
            if (request !== attempt.current) return;
            if (result.correct) onTaskComplete?.(`round-${progress.round + 1}-count`);
            setProgress(advanceStoryProgress(progress, { type: "counts_checked", correct: result.correct }, data.rounds.length));
            setSelected(null);
            setFeedback(result.correct ? "Counts correct. Now choose the pair with the highest count; break ties alphabetically." : "One or more counts need another look. Add every occurrence of each pair, multiplied by its word's frequency.");
        } catch (error) {
            if (request === attempt.current) setFeedback(error instanceof Error ? error.message : "Could not check the counts.");
        } finally {
            if (request === attempt.current) setPending(false);
        }
    };

    const merge = async () => {
        if (!source || !data || !selected || pending || progress.stage !== "merge") return;
        const request = attempt.current;
        setPending(true);
        try {
            const result = await checkBpeMerge(source, progress.round, selected);
            if (request !== attempt.current) return;
            const next = advanceStoryProgress(progress, { type: "merge_checked", correct: result.correct }, data.rounds.length);
            setProgress(next);
            if (!result.correct) { setFeedback("That pair is not the next merge. Compare your verified counts; for a tie, choose the alphabetically first pair."); return; }
            onTaskComplete?.(`round-${progress.round + 1}-merge`);
            setDrafts({}); setSelected(null);
            setFeedback(next.stage === "complete" ? "Training complete: you counted the pairs and chose the correct merge in every round." : "Correct merge applied throughout the corpus. The tokens have changed; count the new candidate pairs before choosing again.");
            if (next.stage === "complete") onComplete();
        } catch (error) {
            if (request === attempt.current) setFeedback(error instanceof Error ? error.message : "Could not check the merge.");
        } finally {
            if (request === attempt.current) setPending(false);
        }
    };

    if (loadError) return <LabFrame><div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{loadError}</div><Button className={actionClass} onClick={() => setRetry(value => value + 1)}>Try again</Button></LabFrame>;
    if (!data) return <PageLoading label="Loading BPE exercise…" />;

    return <LabFrame>
        <div className="flex shrink-0 items-start justify-between gap-3"><ActivityIntroduction narration={narration} className="flex-1"><h2 className="text-lg font-semibold text-blue-950">Count first, then choose a merge</h2></ActivityIntroduction><span className="shrink-0 text-sm text-blue-900">{finished ? "Training complete" : `Merge ${progress.round + 1} of ${data.rounds.length}`}</span></div>
        <ol aria-label="Steps for each merge" className="grid shrink-0 grid-cols-2 gap-2 text-sm">
            <li aria-current={progress.stage === "count" ? "step" : undefined} className={`rounded-lg border px-3 py-2 ${progress.stage === "count" ? "border-blue-400 bg-blue-50 text-blue-950" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}><strong>1. Count the pairs</strong><span className="ml-2 text-xs">{progress.stage === "count" ? "Current step" : "Complete"}</span></li>
            <li aria-current={progress.stage === "merge" ? "step" : undefined} className={`rounded-lg border px-3 py-2 ${finished ? "border-emerald-200 bg-emerald-50 text-emerald-900" : progress.stage === "merge" ? "border-blue-400 bg-blue-50 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-500"}`}><strong>2. Choose the merge</strong><span className="ml-2 text-xs">{finished ? "Complete" : progress.stage === "merge" ? "Current step" : "Unlocks after correct counts"}</span></li>
        </ol>
        <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-3">
            <section aria-label="Corpus for this merge" className="min-h-0 overflow-auto rounded-xl border border-slate-200 p-3">
                <h3 className="mb-2 font-semibold text-blue-950">{finished ? "Final tokens" : "Current tokens"}</h3>
                <BpeCorpusView corpus={corpus} />
                <p className="mt-3 text-sm text-slate-600">The number at the right is the word's frequency. Each adjacent occurrence contributes that frequency to the pair's count. <code>{"</w>"}</code> marks the end of a word.</p>
            </section>
            <section className="flex min-h-0 flex-col gap-3 rounded-xl bg-blue-50 p-3">
                {finished ? <><h3 className="font-semibold text-blue-950">Rules you learned</h3><ol className="min-h-0 flex-1 space-y-2 overflow-auto">{data.rounds.map((item, index) => <li key={index} className="rounded-lg bg-white p-3 font-mono text-sm">{index + 1}. {item.rule.left} + {item.rule.right} → {item.rule.left}{item.rule.right}</li>)}</ol></> : progress.stage === "count" ? <form className="flex min-h-0 flex-1 flex-col gap-3" onSubmit={event => { event.preventDefault(); void checkCounts(); }}>
                    <div className="shrink-0"><h3 className="font-semibold text-blue-950">Your task: count each candidate pair</h3><p className="mt-1 text-sm text-slate-600">Enter the weighted totals. Correct counts unlock merge selection.</p></div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-auto">{current?.questions.map(pair => <label key={pairKey(pair)} className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white p-3"><code className="min-w-0 break-all text-sm">{pair.left} + {pair.right}</code><input aria-label={`Weighted count for ${pair.left} + ${pair.right}`} type="number" inputMode="numeric" min="0" step="1" required value={drafts[pairKey(pair)] ?? ""} disabled={pending} onChange={event => { setDrafts(previous => ({ ...previous, [pairKey(pair)]: event.target.value })); setFeedback(countPrompt); }} className="w-24 shrink-0 rounded-md border border-blue-200 px-2 py-1 text-sm" /></label>)}</div>
                    <Button type="submit" className={actionClass} disabled={pending || !answers}>{pending ? "Checking counts…" : "Check counts"}</Button>
                </form> : <>
                    <div className="shrink-0"><h3 className="font-semibold text-blue-950">Your task: choose the next merge</h3><p className="mt-1 text-sm text-slate-600">Use your verified counts. Pick the highest count; break ties alphabetically.</p></div>
                    <div className="min-h-0 flex-1 overflow-auto p-1"><div className="grid grid-cols-2 gap-2">{current?.questions.map(pair => <Button key={pairKey(pair)} aria-pressed={selected !== null && pairKey(selected) === pairKey(pair)} disabled={pending} onClick={() => setSelected(pair)} className={`${optionClass} justify-between gap-2 font-mono ${selected && pairKey(selected) === pairKey(pair) ? "ring-2 ring-blue-600" : ""}`}><span className="min-w-0 break-all">{pair.left} + {pair.right}</span><strong>{drafts[pairKey(pair)]}</strong></Button>)}</div></div>
                    <div className="flex shrink-0 flex-wrap gap-2"><Button className={actionClass} disabled={pending || !selected} onClick={() => { void merge(); }}>{pending ? "Checking merge…" : "Merge selected pair"}</Button><Button className={optionClass} disabled={pending} onClick={() => { setProgress(advanceStoryProgress(progress, { type: "edit_counts" }, data.rounds.length)); setSelected(null); setFeedback(countPrompt); }}>Edit counts</Button></div>
                </>}
            </section>
        </div>
        <Status success={finished}>{feedback}</Status>
    </LabFrame>;
}
