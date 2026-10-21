import { useEffect, useState } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import type { IndexPageProps } from "@/types/page";
import { checkPorterStep } from "@/api/text_preprocessing";
import { Button } from "@/components/ui/button";
import { LabFrame, optionClass, Status } from "../shared/LabFrame";
import WordsEditor from "../shared/WordsEditor";
import { usePorterExamples } from "./usePorterExamples";

export default function PorterLab({ narration, onComplete, onTaskComplete, completedTasks = [] }: Pick<IndexPageProps, "narration" | "onComplete" | "onTaskComplete" | "completedTasks">) {
    const examples = usePorterExamples();
    const [restored] = useState(() => new Set(completedTasks));
    const [completedWords, setCompletedWords] = useState(() => new Set(completedTasks));
    const [wordIndex, setWordIndex] = useState(0);
    const [round, setRound] = useState(0);
    const [checking, setChecking] = useState(false);
    const [feedback, setFeedback] = useState("Choose the form produced by the current rule.");
    const word = examples.data?.examples[Math.min(wordIndex, examples.data.examples.length - 1)];
    const changed = word?.steps?.filter(step => step.before !== step.after) ?? [];
    const steps = changed.length ? changed : word?.steps?.slice(0, 1) ?? [];
    const currentRound = word && restored.has(`predict-${word.word}`) ? steps.length : round;
    const step = steps[currentRound];
    const finished = Boolean(word) && currentRound >= steps.length;
    useEffect(() => {
        if (!examples.data || !restored.size) return;
        const first = examples.data.examples.findIndex(item => !restored.has(`predict-${item.word}`));
        setWordIndex(Math.max(0, first));
        setRound(0);
    }, [examples.data, restored]);
    const pending = checking || examples.pending;
    const choose = async (answer: string) => {
        if (!word || !step || !examples.source || checking) return;
        setChecking(true);
        try {
            const result = await checkPorterStep(examples.source, word.word, step.index, answer);
            setFeedback(result.message);
            if (result.correct) {
                setRound(round + 1);
                if (round + 1 === steps.length) {
                    onTaskComplete?.(`predict-${word.word}`);
                    const next = new Set([...completedWords, `predict-${word.word}`]);
                    setCompletedWords(next);
                    if (examples.data?.examples.every(item => next.has(`predict-${item.word}`))) onComplete();
                }
            }
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not check this form."); }
        finally { setChecking(false); }
    };
    return <LabFrame>
        <ActivityIntroduction narration={narration}><h2 className="shrink-0 text-lg font-semibold">Predict the suffix changes</h2></ActivityIntroduction>
        <WordsEditor value={examples.draft} onChange={examples.setDraft} pending={pending} onApply={async () => { if (await examples.apply()) { setWordIndex(0); setRound(0); setFeedback("New words loaded. Predict a rule result."); } }} />
        <div className="flex shrink-0 flex-wrap gap-2">{examples.data?.examples.map((item, index) => <Button key={item.word} className={optionClass} disabled={pending} aria-pressed={wordIndex === index} onClick={() => { setWordIndex(index); setRound(0); setFeedback("Predict the next changed form."); }}>{item.word}</Button>)}</div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            <section className="flex min-h-0 flex-col justify-center gap-3 rounded-xl bg-sky-50 p-4">
                {step ? <><p className="text-sm font-semibold text-sky-900">{step.label}</p><p className="rounded-lg bg-white p-3 text-center font-mono text-2xl break-all">{step.before}</p><div className="grid gap-2">{step.candidates.map(candidate => <Button key={candidate} className={optionClass} disabled={pending} onClick={() => choose(candidate)}>Apply → {candidate}</Button>)}</div></> : <p className="text-center font-mono text-2xl text-emerald-800 break-all">{word ? `${word.word} → ${word.stem}` : "Loading words…"}</p>}
            </section>
            <section className="min-h-0 overflow-auto rounded-xl border border-sky-100 p-3"><h3 className="mb-2 font-semibold">Forms you produced</h3>{steps.slice(0, currentRound).map(item => <div key={item.index} className="mb-2 rounded-lg bg-slate-50 p-3 text-sm"><p className="text-slate-600">{item.label}</p><code>{item.before} → {item.after}</code></div>)}{finished && <div className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-950">{changed.length ? `Final stem: ${word?.stem}` : "No suffix rule changes this word."}</div>}</section>
        </div>
        <Status success={finished}>{examples.error || feedback}</Status>
    </LabFrame>;
}
