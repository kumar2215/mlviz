import { useState } from "react";
import { checkPorterStep } from "@/api/text_preprocessing";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { actionClass, LabFrame, optionClass, Status } from "../shared/LabFrame";
import WordsEditor from "../shared/WordsEditor";
import { usePorterExamples } from "./usePorterExamples";

interface Props {
    subpageIndex: number;
    completionButtonId: string;
    onSubpageReady: () => void;
}

export default function PorterExplore({ subpageIndex, completionButtonId, onSubpageReady }: Props) {
    const examples = usePorterExamples();
    const [wordIndex, setWordIndex] = useState(subpageIndex);
    const [revealed, setRevealed] = useState(false);
    const [checking, setChecking] = useState(false);
    const [feedback, setFeedback] = useState("Apply the current group to see whether this word changes.");
    const { recordButtonClick } = useHistoryRecorder();
    const selectedIndex = Math.min(wordIndex, (examples.data?.examples.length ?? 1) - 1);
    const word = examples.data?.examples[selectedIndex];
    const step = word?.steps?.[subpageIndex];
    const pending = checking || examples.pending;

    const apply = async () => {
        if (!word || !step || !examples.source) return;
        setChecking(true);
        try {
            const result = await checkPorterStep(examples.source, word.word, step.index, step.after);
            if (result.correct) {
                setRevealed(true);
                setFeedback(step.before === step.after ? "Unchanged: this group’s suffix and stem conditions do not trigger a change." : result.message);
                onSubpageReady();
                if (subpageIndex === (word.steps?.length ?? 0) - 1) recordButtonClick(completionButtonId);
            } else setFeedback("The rule result changed. Reload the word examples and try again.");
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : "Could not apply the rule group.");
        } finally { setChecking(false); }
    };

    return <LabFrame>
        <h2 className="shrink-0 text-lg font-semibold">Try each rule group</h2>
        <WordsEditor value={examples.draft} onChange={examples.setDraft} pending={pending} onApply={async () => {
            if (await examples.apply()) { setWordIndex(0); setRevealed(false); setFeedback("New words loaded. Apply the current rule group."); }
        }} />
        <div className="flex max-h-24 shrink-0 flex-wrap gap-2 overflow-auto">{examples.data?.examples.map((item, index) =>
            <Button key={item.word} className={optionClass} disabled={pending} aria-pressed={selectedIndex === index} onClick={() => { setWordIndex(index); setRevealed(false); setFeedback("Apply this group to compare the result."); }}>{item.word}</Button>,
        )}</div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            <section className="flex min-h-0 flex-col justify-center gap-3 rounded-xl bg-sky-50 p-4">
                <h3 className="text-sm font-semibold text-sky-900">{step?.label ?? "Loading rule group…"}</h3>
                <div><p className="mb-1 text-xs text-slate-600">Input at this stage</p><p className="break-all rounded-lg bg-white p-3 text-center font-mono text-2xl">{step?.before}</p></div>
                <Button className={actionClass} disabled={pending || !step || revealed} onClick={apply}>Apply rule group</Button>
                {revealed && step && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs text-emerald-800">{step.before === step.after ? "Unchanged" : "Result of this group"}</p><p className="break-all font-mono text-2xl text-emerald-950">{step.after}</p></div>}
            </section>
            <section className="min-h-0 overflow-auto rounded-xl border border-sky-100 p-3">
                <h3 className="mb-2 font-semibold">Earlier rule groups</h3>
                {word?.steps?.slice(0, subpageIndex).map(item => <div key={item.index} className="mb-2 rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-600">{item.label}</p><p className="break-all font-mono text-sm">{item.before} → {item.after}</p></div>)}
                {subpageIndex === 0 && <p className="text-sm text-slate-500">Original word: <code>{word?.word}</code></p>}
            </section>
        </div>
        <Status success={revealed}>{examples.error || feedback}</Status>
    </LabFrame>;
}
