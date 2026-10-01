import { checkPorter, loadPorterState, type PorterState } from "@/api/tokenization";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { useDataset } from "@/store/useDataset";
import type { PredefinedPorterDataset } from "@/types/dataset";
import type { IndexPageProps } from "@/types/page";
import { useEffect, useState } from "react";

interface PorterViewProps {
    dataset: PredefinedPorterDataset;
    subpageIndex: number;
    onSubpageReady: () => void;
    completionButtonId: string;
}

function PorterView({ dataset, subpageIndex, onSubpageReady, completionButtonId }: PorterViewProps) {
    const [state, setState] = useState<PorterState | null>(null);
    const [selectedExample, setSelectedExample] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState("");
    const [pending, setPending] = useState(false);
    const [completed, setCompleted] = useState(false);
    const { recordButtonClick } = useHistoryRecorder();

    useEffect(() => {
        let active = true;
        loadPorterState(dataset).then(result => {
            if (active) setState(result);
        }).catch(reason => {
            if (active) setFeedback(reason instanceof Error ? reason.message : "Could not load stems.");
        });
        return () => { active = false; };
    }, [dataset]);

    const checkAnswers = async () => {
        if (!state) return;
        if (state.quiz_words.some(word => !answers[word]?.trim())) {
            setFeedback("Enter a stem for each word.");
            return;
        }
        setPending(true);
        try {
            const result = await checkPorter(dataset, state.quiz_words.map(word => ({ word, stem: answers[word] })));
            setFeedback(result.correct ? "All three stems match the Porter rules." : "At least one stem needs another look. Compare the suffix changes above.");
            if (result.correct && !completed) {
                setCompleted(true);
                onSubpageReady();
                recordButtonClick(completionButtonId);
            }
        } catch (reason) {
            setFeedback(reason instanceof Error ? reason.message : "Could not check stems.");
        } finally {
            setPending(false);
        }
    };

    if (!state && feedback) return <div role="alert" className="p-4 text-red-700">{feedback}</div>;
    if (!state) return <div className="p-4">Loading Porter examples…</div>;
    const example = selectedExample === null ? null : state.examples[selectedExample];

    return <main className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-violet-50 to-fuchsia-50 px-3 py-2">
        <section className="mx-auto flex h-full max-w-5xl flex-col gap-3 rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
            <h1 className="text-lg font-semibold text-violet-950">Porter stemmer</h1>
            {subpageIndex === 0 ? <>
                <div className="grid grid-cols-3 gap-2">
                    {state.examples.map((item, index) => <Button
                        key={item.word}
                        type="button"
                        onClick={() => { setSelectedExample(index); onSubpageReady(); }}
                        className={`h-auto min-h-16 flex-col border px-2 py-2 shadow-sm ${selectedExample === index ? "border-violet-600 !bg-violet-600 text-white" : "border-violet-200 !bg-violet-50 text-violet-950 hover:!bg-violet-100"}`}
                    ><span className="font-mono">{item.word} → {item.stem}</span></Button>)}
                </div>
                <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h2 className="mb-2 font-semibold text-slate-800">Changed forms</h2>
                    {example ? <div className="grid gap-2">{example.changes.map(change => <div key={change.step} className="flex items-center justify-between rounded-md border border-violet-100 bg-white px-3 py-2 text-sm"><span>{change.step}</span><code className="font-semibold text-violet-900">{change.word}</code></div>)}</div>
                        : <p className="text-sm text-slate-600">Select a word to inspect its rule changes.</p>}
                </div>
            </> : <>
                <div className="grid grid-cols-3 gap-2">
                    {state.quiz_words.map(word => <label key={word} className="flex flex-col gap-2 rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm font-medium text-violet-950">
                        <span className="font-mono">{word}</span>
                        <input aria-label={`Stem for ${word}`} value={answers[word] ?? ""} onChange={event => { setAnswers(current => ({ ...current, [word]: event.target.value })); setFeedback(""); }} className="w-full rounded-md border border-violet-200 bg-white px-2 py-2 font-mono" />
                    </label>)}
                </div>
                <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Button type="button" disabled={pending || completed} onClick={checkAnswers} className="!bg-violet-700 text-white hover:!bg-violet-800">Check stems</Button>
                    {feedback && <p role="status" className="mt-3 text-sm font-medium text-violet-900">{feedback}</p>}
                </div>
            </>}
        </section>
    </main>;
}

export default function IndexPage({ name, subpageIndex = 0, replayKey = 0, onSubpageReady, completionButtonId }: IndexPageProps) {
    const dataset = useDataset(state => state.activeDataset);
    if (name !== "PorterStemmer" || dataset?.type !== "predefined_porter" || !onSubpageReady || !completionButtonId) {
        return <div role="alert" className="p-4">Porter page configuration is incomplete.</div>;
    }
    return <PorterView key={replayKey} dataset={dataset} subpageIndex={subpageIndex} onSubpageReady={onSubpageReady} completionButtonId={completionButtonId} />;
}
