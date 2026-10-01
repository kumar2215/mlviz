import { checkRegex, loadRegexState, previewRegex, type RegexPreview, type RegexState } from "@/api/tokenization";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { useDataset } from "@/store/useDataset";
import type { PredefinedRegexDataset } from "@/types/dataset";
import type { IndexPageProps } from "@/types/page";
import { useEffect, useState } from "react";

interface RegexViewProps {
    dataset: PredefinedRegexDataset;
    subpageIndex: number;
    onSubpageReady: () => void;
    completionButtonId: string;
}

function RegexView({ dataset, subpageIndex, onSubpageReady, completionButtonId }: RegexViewProps) {
    const [state, setState] = useState<RegexState | null>(null);
    const [preview, setPreview] = useState<RegexPreview | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [feedback, setFeedback] = useState("");
    const [pending, setPending] = useState(false);
    const [completed, setCompleted] = useState(false);
    const { recordButtonClick } = useHistoryRecorder();

    useEffect(() => {
        let active = true;
        loadRegexState(dataset).then(result => {
            if (active) setState(result);
        }).catch(reason => {
            if (active) setFeedback(reason instanceof Error ? reason.message : "Could not load patterns.");
        });
        return () => { active = false; };
    }, [dataset]);

    const selectPattern = async (optionId: string) => {
        setSelected(optionId);
        setPreview(null);
        setFeedback("");
        if (subpageIndex !== 0) return;
        setPending(true);
        try {
            const result = await previewRegex(dataset, optionId);
            setPreview(result);
            onSubpageReady();
        } catch (reason) {
            setFeedback(reason instanceof Error ? reason.message : "Could not preview this pattern.");
        } finally {
            setPending(false);
        }
    };

    const checkChoice = async () => {
        if (!selected) return;
        setPending(true);
        try {
            const result = await checkRegex(dataset, selected);
            setFeedback(result.correct ? "Correct: the contraction stays whole and punctuation stands alone." : "Compare what happens to the contraction and punctuation.");
            if (result.correct && !completed) {
                setCompleted(true);
                onSubpageReady();
                recordButtonClick(completionButtonId);
            }
        } catch (reason) {
            setFeedback(reason instanceof Error ? reason.message : "Could not check the pattern.");
        } finally {
            setPending(false);
        }
    };

    if (!state && feedback) return <div role="alert" className="p-4 text-red-700">{feedback}</div>;
    if (!state) return <div className="p-4">Loading regex example…</div>;

    return <main className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50 px-3 py-2">
        <section className="mx-auto flex h-full max-w-5xl flex-col gap-3 rounded-xl border border-cyan-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-lg font-semibold text-cyan-950">Regex tokenizer</h1>
                <code className="rounded-lg bg-slate-100 px-3 py-2 text-sm">{state.text}</code>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {state.options.map(option => <Button
                    key={option.id}
                    type="button"
                    disabled={pending}
                    onClick={() => selectPattern(option.id)}
                    className={`h-auto min-h-20 flex-col whitespace-normal border px-2 py-2 text-center shadow-sm ${selected === option.id ? "border-cyan-600 !bg-cyan-600 text-white" : "border-cyan-200 !bg-cyan-50 text-cyan-950 hover:!bg-cyan-100"}`}
                >
                    <span>{option.label}</span>
                    <code className="text-xs">{option.pattern}</code>
                </Button>)}
            </div>
            <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {subpageIndex === 0 ? <>
                    <h2 className="mb-2 font-semibold text-slate-800">Matched tokens</h2>
                    {preview ? <div className="flex flex-wrap gap-2">{preview.matches.map((match, index) =>
                        <span key={`${match.start}-${index}`} className="rounded-md border border-cyan-200 bg-white px-3 py-2 font-mono text-sm">{match.text}</span>,
                    )}</div> : <p className="text-sm text-slate-600">Select a pattern to see which pieces it finds.</p>}
                </> : <>
                    <h2 className="mb-2 font-semibold text-slate-800">Which pattern keeps “don't” together and punctuation separate?</h2>
                    <p className="mb-3 text-sm text-slate-600">Select one of the patterns above, then check your choice.</p>
                    <Button type="button" disabled={!selected || pending || completed} onClick={checkChoice} className="!bg-cyan-700 text-white hover:!bg-cyan-800">Check choice</Button>
                </>}
                {feedback && <p role="status" className="mt-3 text-sm font-medium text-cyan-900">{feedback}</p>}
            </div>
        </section>
    </main>;
}

export default function IndexPage({ name, subpageIndex = 0, replayKey = 0, onSubpageReady, completionButtonId }: IndexPageProps) {
    const dataset = useDataset(state => state.activeDataset);
    if (name !== "RegexTokenizer" || dataset?.type !== "predefined_regex" || !onSubpageReady || !completionButtonId) {
        return <div role="alert" className="p-4">Regex page configuration is incomplete.</div>;
    }
    return <RegexView key={replayKey} dataset={dataset} subpageIndex={subpageIndex} onSubpageReady={onSubpageReady} completionButtonId={completionButtonId} />;
}
