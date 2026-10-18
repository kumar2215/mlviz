import { useState } from "react";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { DragChip, DragSurface, DropTarget, Frame, Result, selectedClass } from "./shared";

const steps = ["Start with labelled flowers", "Compare possible splits", "Repeat within each group", "Predict at a leaf"];

export default function TraceTraining({ completionButtonId }: { completionButtonId: string }) {
    const [slots, setSlots] = useState<(number | null)[]>([null, null, null, null]);
    const [checked, setChecked] = useState(false);
    const [finished, setFinished] = useState(false);
    const [feedback, setFeedback] = useState("Arrange all four steps, then check the sequence.");
    const { recordButtonClick } = useHistoryRecorder();
    const place = (id: string, target: number) => {
        const step = Number(id);
        if (!Number.isInteger(step) || step < 0 || step >= steps.length || finished) return;
        const source = slots.indexOf(step);
        const next = [...slots];
        if (source >= 0) next[source] = next[target];
        next[target] = step;
        setSlots(next);
        setChecked(false);
        setFeedback("Drop another step or check your sequence.");
    };
    const check = () => {
        setChecked(true);
        if (slots.every((step, index) => step === index)) {
            setFinished(true);
            setFeedback("Correct sequence. The final page is unlocked.");
            recordButtonClick(completionButtonId);
        } else setFeedback("The highlighted steps are out of order. Drag them to another position.");
    };
    return <Frame><DragSurface>
        <h2 className="shrink-0 text-lg font-semibold">Rebuild the training sequence</h2>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
            <section className="flex min-h-0 flex-col justify-center gap-3 rounded-xl bg-blue-50 p-4"><h3 className="font-semibold text-blue-900">Steps to place</h3>{[2, 0, 3, 1].filter(step => !slots.includes(step)).map(step => <DragChip key={step} id={String(step)} label={`Training step: ${steps[step]}`}>{steps[step]}</DragChip>)}{slots.every(step => step !== null) && <p className="text-sm text-blue-800">All steps placed.</p>}</section>
            <section className="flex min-h-0 flex-col justify-center gap-2" aria-label="Training sequence">{slots.map((step, index) => <div key={index}>
                <DropTarget label={`Training position ${index + 1}`} disabled={finished} onPlace={id => place(id, index)} className={`flex items-center gap-2 ${checked && step !== index ? "!border-amber-500 !bg-amber-50" : ""}`}><span className="lesson-part-marker shrink-0">{index + 1}</span>{step === null ? <span className="text-sm text-slate-500">Drop a step</span> : <DragChip id={String(step)} disabled={finished} label={`Placed step: ${steps[step]}`}>{steps[step]}</DragChip>}</DropTarget>
                {index < slots.length - 1 && <div aria-hidden="true" className="text-center text-sm leading-none text-blue-400">↓</div>}
            </div>)}</section>
        </div>
        <div className="flex shrink-0 justify-end"><Button className={selectedClass} disabled={slots.some(step => step === null) || finished} onClick={check}>Check sequence</Button></div>
        <Result success={finished}>{feedback}</Result>
    </DragSurface></Frame>;
}
