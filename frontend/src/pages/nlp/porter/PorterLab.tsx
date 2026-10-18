import { useState } from "react";
import { checkPorterStep } from "@/api/text_preprocessing";
import { Button } from "@/components/ui/button";
import { LabFrame, optionClass, Status } from "../shared/LabFrame";
import WordsEditor from "../shared/WordsEditor";
import { usePorterExamples } from "./usePorterExamples";

export default function PorterLab() {
    const examples = usePorterExamples();
    const [wordIndex, setWordIndex] = useState(0);
    const [round, setRound] = useState(0);
    const [checking, setChecking] = useState(false);
    const [feedback, setFeedback] = useState("Choose the form produced by the current rule.");
    const word = examples.data?.examples[Math.min(wordIndex, examples.data.examples.length - 1)];
    const changed = word?.steps?.filter(step => step.before !== step.after) ?? [];
    const steps = changed.length ? changed : word?.steps?.slice(0, 1) ?? [];
    const step = steps[round];
    const finished = Boolean(word) && round >= steps.length;
    const pending = checking || examples.pending;
    const choose = async (answer: string) => {
        if (!word || !step || !examples.source) return;
        setChecking(true);
        try {
            const result = await checkPorterStep(examples.source, word.word, step.index, answer);
            setFeedback(result.message);
            if (result.correct) setRound(value => value + 1);
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not check this form."); }
        finally { setChecking(false); }
    };
    return <LabFrame>
        <h2 className="shrink-0 text-lg font-semibold">Predict the suffix changes</h2>
        <WordsEditor value={examples.draft} onChange={examples.setDraft} pending={pending} onApply={async () => { if (await examples.apply()) { setWordIndex(0); setRound(0); setFeedback("New words loaded. Predict a rule result."); } }} />
        <div className="flex shrink-0 flex-wrap gap-2">{examples.data?.examples.map((item, index) => <Button key={item.word} className={optionClass} disabled={pending} aria-pressed={wordIndex === index} onClick={() => { setWordIndex(index); setRound(0); setFeedback("Predict the next changed form."); }}>{item.word}</Button>)}</div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            <section className="flex min-h-0 flex-col justify-center gap-3 rounded-xl bg-sky-50 p-4">
                {step ? <><p className="text-sm font-semibold text-sky-900">{step.label}</p><p className="rounded-lg bg-white p-3 text-center font-mono text-2xl break-all">{step.before}</p><div className="grid gap-2">{step.candidates.map(candidate => <Button key={candidate} className={optionClass} disabled={pending} onClick={() => choose(candidate)}>Apply → {candidate}</Button>)}</div></> : <p className="text-center font-mono text-2xl text-emerald-800 break-all">{word ? `${word.word} → ${word.stem}` : "Loading words…"}</p>}
            </section>
            <section className="min-h-0 overflow-auto rounded-xl border border-sky-100 p-3"><h3 className="mb-2 font-semibold">Forms you produced</h3>{steps.slice(0, round).map(item => <div key={item.index} className="mb-2 rounded-lg bg-slate-50 p-3 text-sm"><p className="text-slate-600">{item.label}</p><code>{item.before} → {item.after}</code></div>)}{finished && <div className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-950">{changed.length ? `Final stem: ${word?.stem}` : "No suffix rule changes this word."}</div>}</section>
        </div>
        <Status success={finished}>{examples.error || feedback}</Status>
    </LabFrame>;
}
