import BpeCorpusView from "./BpeCorpusView";
import { useBpeState } from "./useBpeState";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import type { PredefinedBpeDataset } from "@/types/dataset";
import { useEffect, useRef } from "react";

interface Props {
    dataset: PredefinedBpeDataset;
    subpageIndex: number;
    replayKey: number;
    onSubpageReady: () => void;
    completionButtonId: string;
}

export default function BpeWalkthrough({ dataset, subpageIndex, replayKey, onSubpageReady, completionButtonId }: Props) {
    const { state, error } = useBpeState(dataset, replayKey);
    const { recordButtonClick } = useHistoryRecorder();
    const completed = useRef(false);
    const ready = state !== null && state.rounds.length >= 2;

    useEffect(() => {
        if (!ready) return;
        onSubpageReady();
        if (subpageIndex === 5 && !completed.current) {
            completed.current = true;
            recordButtonClick(completionButtonId);
        }
    }, [ready, subpageIndex, onSubpageReady, completionButtonId, recordButtonClick]);

    if (error) return <div role="alert" className="p-4 text-red-700">{error}</div>;
    if (!state) return <div className="p-4">Loading BPE corpus…</div>;
    if (!ready) return <div role="alert" className="p-4 text-red-700">This corpus has fewer than two BPE rules.</div>;

    const roundIndex = subpageIndex <= 2 ? 0 : 1;
    const round = state.rounds[roundIndex];
    const corpus = subpageIndex === 0 ? state.initial : subpageIndex === 2 || subpageIndex >= 4 ? round.after : round.before;
    const showCounts = subpageIndex === 1 || subpageIndex === 3;
    const showRule = subpageIndex === 2 || subpageIndex === 4 || subpageIndex === 5;

    return (
        <main className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-indigo-50 to-sky-50 px-3 py-2">
            <section className="mx-auto flex h-full max-w-5xl flex-col gap-2 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="font-semibold text-indigo-900">BPE training trace</h1>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 font-mono text-xs">{subpageIndex === 0 ? "Initial" : `Round ${roundIndex + 1}`}</span>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] gap-3">
                    <section className="min-h-0 rounded-lg border border-slate-200 p-2">
                        <h2 className="mb-2 text-sm font-semibold">Corpus</h2>
                        <BpeCorpusView corpus={corpus} />
                    </section>
                    <section className="min-h-0 rounded-lg border border-indigo-100 bg-indigo-50 p-2">
                        <h2 className="mb-2 text-sm font-semibold">{showCounts ? "Weighted pair counts" : "Learned merges"}</h2>
                        {showCounts ? (
                            <div className="grid gap-1">
                                {round.counts.slice(0, 6).map(pair => <div key={`${pair.left}-${pair.right}`} className="flex justify-between rounded bg-white px-2 py-1 font-mono text-xs"><span>{pair.left} + {pair.right}</span><strong>{pair.count}</strong></div>)}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {state.rounds.slice(0, subpageIndex === 5 ? 2 : showRule ? roundIndex + 1 : 0).map((item, index) => <div key={index} className="rounded bg-white p-2 font-mono text-sm">{item.rule.left} + {item.rule.right} → {item.rule.left}{item.rule.right}</div>)}
                                {subpageIndex === 0 && <div className="rounded bg-white p-2 text-sm">No merges yet</div>}
                            </div>
                        )}
                    </section>
                </div>
            </section>
        </main>
    );
}
