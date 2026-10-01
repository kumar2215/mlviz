import { checkBpeCounts, checkBpeMerge, checkBpeTokenizations, type BpePair } from "@/api/bpe";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import type { PredefinedBpeDataset } from "@/types/dataset";
import { useState } from "react";
import BpeCorpusView from "./BpeCorpusView";
import { useBpeState } from "./useBpeState";

interface Props {
    dataset: PredefinedBpeDataset;
    subpageIndex: number;
    replayKey: number;
    onSubpageReady: () => void;
    completionButtonId: string;
}

const pairKey = (pair: BpePair) => `${pair.left}\u0000${pair.right}`;

export default function BpeTraining({ dataset, subpageIndex, replayKey, onSubpageReady, completionButtonId }: Props) {
    const { state, error } = useBpeState(dataset, replayKey);
    const { recordButtonClick } = useHistoryRecorder();
    const [countAnswers, setCountAnswers] = useState<Record<string, string>>({});
    const [tokenAnswers, setTokenAnswers] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState("");
    const [pending, setPending] = useState(false);
    const [completed, setCompleted] = useState(false);

    if (error) return <div role="alert" className="p-4 text-red-700">{error}</div>;
    if (!state) return <div className="p-4">Loading BPE corpus…</div>;
    if (state.rounds.length < 2) return <div role="alert" className="p-4 text-red-700">This corpus has fewer than two BPE rules.</div>;

    const roundIndex = Math.min(Math.floor(subpageIndex / 2), 1);
    const round = state.rounds[roundIndex];
    const isCountStep = subpageIndex === 0 || subpageIndex === 2;
    const isMergeStep = subpageIndex === 1 || subpageIndex === 3;

    const checkCounts = async () => {
        const answers = round.questions.map(pair => ({ ...pair, count: Number(countAnswers[`${roundIndex}-${pairKey(pair)}`]) }));
        if (round.questions.some(pair => !countAnswers[`${roundIndex}-${pairKey(pair)}`]?.trim())) {
            setFeedback("Enter every count before checking.");
            return;
        }
        setPending(true);
        try {
            const result = await checkBpeCounts(dataset, roundIndex, answers);
            setFeedback(result.correct ? "All counts are correct." : "Recount the adjacent pairs using each word's frequency.");
            if (result.correct) onSubpageReady();
        } catch (reason) {
            setFeedback(reason instanceof Error ? reason.message : "Could not check counts.");
        } finally { setPending(false); }
    };

    const chooseMerge = async (pair: BpePair) => {
        setPending(true);
        try {
            const result = await checkBpeMerge(dataset, roundIndex, pair);
            setFeedback(result.correct ? "Correct merge rule." : "That pair is not the strongest next merge.");
            if (result.correct) onSubpageReady();
        } catch (reason) {
            setFeedback(reason instanceof Error ? reason.message : "Could not check the merge.");
        } finally { setPending(false); }
    };

    const checkTokens = async () => {
        setPending(true);
        try {
            const result = await checkBpeTokenizations(dataset, state.test_words.map(word => ({
                word,
                tokens: (tokenAnswers[word] ?? "").trim().split(/\s+/).filter(Boolean),
            })));
            setFeedback(result.correct ? "All tokenizations are correct." : "At least one split needs another look.");
            if (result.correct && !completed) {
                setCompleted(true);
                onSubpageReady();
                recordButtonClick(completionButtonId);
            }
        } catch (reason) {
            setFeedback(reason instanceof Error ? reason.message : "Could not check tokenizations.");
        } finally { setPending(false); }
    };

    return (
        <main className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-violet-50 to-sky-50 px-3 py-2">
            <section className="mx-auto flex h-full max-w-5xl flex-col gap-2 rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="font-semibold text-violet-900">Train BPE</h1>
                    <span className="rounded-full bg-violet-100 px-3 py-1 font-mono text-xs">{subpageIndex >= 4 ? "Apply rules" : `Round ${roundIndex + 1}`}</span>
                </div>
                {(isCountStep || isMergeStep) && <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] gap-3">
                    <section className="rounded-lg border border-slate-200 p-2">
                        <h2 className="mb-2 text-sm font-semibold">Weighted corpus</h2>
                        <BpeCorpusView corpus={round.before} />
                    </section>
                    <section className="rounded-lg border border-violet-100 bg-violet-50 p-2">
                        <h2 className="mb-2 text-sm font-semibold">{isCountStep ? "Pair counts" : "Select the highest count"}</h2>
                        {isCountStep ? <div className="grid gap-1">
                            {round.questions.map(pair => <label key={pairKey(pair)} className="flex items-center justify-between rounded bg-white px-2 py-1 font-mono text-sm">
                                <span>{pair.left} + {pair.right}</span>
                                <input aria-label={`Count for ${pair.left} plus ${pair.right}`} type="number" min="0" value={countAnswers[`${roundIndex}-${pairKey(pair)}`] ?? ""} onChange={event => setCountAnswers(current => ({ ...current, [`${roundIndex}-${pairKey(pair)}`]: event.target.value }))} className="w-16 rounded border border-violet-200 px-1 text-right" />
                            </label>)}
                            <Button disabled={pending} onClick={checkCounts} className="mt-1 bg-violet-600! text-white">Check counts</Button>
                        </div> : <div className="grid gap-1">
                            {round.questions.map(pair => <Button key={pairKey(pair)} disabled={pending} variant="outline" onClick={() => chooseMerge(pair)} className="justify-start font-mono">{pair.left} + {pair.right}</Button>)}
                        </div>}
                    </section>
                </div>}
                {subpageIndex === 4 && <section className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                    <h2 className="mb-2 text-sm font-semibold">Tokenize these words with the learned rules</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {state.test_words.map(word => <label key={word} className="rounded bg-white p-2 font-mono text-sm"><span>{word} + &lt;/w&gt;</span><input aria-label={`Tokenization for ${word}`} value={tokenAnswers[word] ?? ""} onChange={event => setTokenAnswers(current => ({ ...current, [word]: event.target.value }))} placeholder="Tokens separated by spaces" className="mt-2 w-full rounded border border-violet-200 px-2 py-1" /></label>)}
                    </div>
                    <Button disabled={pending || completed} onClick={checkTokens} className="mt-3 bg-violet-600 text-white">Check tokenizations</Button>
                </section>}
                {subpageIndex === 5 && <div className="rounded-lg bg-emerald-50 p-3 text-emerald-900">Training complete. The learned rules tokenize new words.</div>}
                <div role="status" className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{feedback || "Complete this step to continue in the NavBar."}</div>
            </section>
        </main>
    );
}
