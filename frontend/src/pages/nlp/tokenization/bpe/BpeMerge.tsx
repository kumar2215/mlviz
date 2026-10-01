import { checkBpeRestore } from "@/api/bpe";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import type { PredefinedBpeDataset } from "@/types/dataset";
import { useState } from "react";
import { useBpeState } from "./useBpeState";

interface Props {
    dataset: PredefinedBpeDataset;
    subpageIndex: number;
    replayKey: number;
    onSubpageReady: () => void;
    completionButtonId: string;
}

export default function BpeMerge({ dataset, subpageIndex, replayKey, onSubpageReady, completionButtonId }: Props) {
    const { state, error } = useBpeState(dataset, replayKey);
    const { recordButtonClick } = useHistoryRecorder();
    const [tokensByRound, setTokensByRound] = useState<Record<number, string[]>>({});
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [feedback, setFeedback] = useState("");
    const [pending, setPending] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [completed, setCompleted] = useState(false);

    if (error) return <div role="alert" className="p-4 text-red-700">{error}</div>;
    if (!state) return <div className="p-4">Loading BPE corpus…</div>;
    if (!state.restore_initial || state.rounds.length < 2) return <div role="alert" className="p-4 text-red-700">Restoration data is unavailable.</div>;

    const roundIndex = Math.min(subpageIndex, state.rounds.length - 1);
    const tokens = subpageIndex === 0 ? state.restore_initial : tokensByRound[subpageIndex] ?? state.restore_initial;
    const rule = state.rounds[roundIndex].rule;

    const select = async (index: number) => {
        if (pending || completed || subpageIndex >= 2) return;
        if (selectedIndex === null) {
            setSelectedIndex(index);
            setFeedback("Select the token immediately to its right.");
            return;
        }
        setPending(true);
        try {
            const result = await checkBpeRestore(dataset, subpageIndex, selectedIndex, index);
            if (result.correct && result.tokens) {
                setTokensByRound(current => ({ ...current, [subpageIndex + 1]: result.tokens! }));
                setFeedback("Merge applied.");
                onSubpageReady();
                if (subpageIndex === 1) {
                    setCompleted(true);
                    recordButtonClick(completionButtonId);
                }
            } else {
                setFeedback("That is not the next learned pair. Try again.");
            }
        } catch (reason) {
            setFeedback(reason instanceof Error ? reason.message : "Could not check the merge.");
        } finally {
            setSelectedIndex(null);
            setPending(false);
        }
    };

    return (
        <main className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-amber-50 to-sky-50 px-3 py-2">
            <section className="mx-auto flex h-full max-w-4xl flex-col gap-3 rounded-xl border border-amber-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="font-semibold text-amber-900">Restore {state.restore_word}</h1>
                    <span className="rounded-full bg-amber-100 px-3 py-1 font-mono text-xs">{subpageIndex === 2 ? "Complete" : `Rule ${subpageIndex + 1} of 2`}</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-semibold">Current tokens</p>
                    <div className="flex flex-wrap gap-2" aria-label="Current BPE tokens">
                        {tokens.map((token, index) => <Button key={`${index}-${token}`} type="button" variant="outline" disabled={pending || subpageIndex === 2} onClick={() => select(index)} className={`font-mono ${selectedIndex === index ? "border-amber-500 bg-amber-100" : ""}`}>{token}</Button>)}
                    </div>
                </div>
                {subpageIndex < 2 && <div className="flex items-center gap-3">
                    <Button type="button" variant="ghost" onClick={() => setShowHint(value => !value)}>Reveal pair hint</Button>
                    {showHint && <span className="font-mono text-sm">{rule.left} + {rule.right}</span>}
                </div>}
                <div role="status" className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{subpageIndex === 2 ? `Final tokens: ${tokens.join(" · ")}` : feedback || "Select two adjacent tokens to apply the next rule."}</div>
            </section>
        </main>
    );
}
