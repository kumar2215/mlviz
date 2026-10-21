import { useState } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import type { IndexPageProps } from "@/types/page";
import { DragChip, DragSurface, DropTarget, Frame, Result, TreeEdges, TreeNode } from "./shared";

const parts = ["Root", "Branch", "Split node", "Leaf"];
const letters = ["A", "B", "C", "D"];

export default function NameTreeParts({ narration, onComplete, onTaskComplete, completedTasks = [] }: Pick<IndexPageProps, "narration" | "onComplete" | "onTaskComplete" | "completedTasks">) {
    const [answers, setAnswers] = useState<Record<number, string>>(() => completedTasks.includes("match-parts") ? Object.fromEntries(parts.map((part, index) => [index, part])) : {});
    const [feedback, setFeedback] = useState(() => completedTasks.includes("match-parts") ? "All labels were matched previously. Use Replay to practice again." : "Match labels to the lettered parts of the tree.");
    const finished = Object.keys(answers).length === parts.length;
    const place = (id: string, index: number) => {
        if (!parts.includes(id) || answers[index] || Object.values(answers).includes(id)) return;
        if (id !== parts[index]) { setFeedback(`${id} does not match ${letters[index]}. Check the highlighted part of the tree.`); return; }
        const next = { ...answers, [index]: id };
        setAnswers(next);
        if (Object.keys(next).length === parts.length) {
            setFeedback("All four labels are correct. The next page is unlocked.");
            onComplete();
            onTaskComplete?.("match-parts");
        } else setFeedback(`${letters[index]} is the ${id.toLowerCase()}.`);
    };
    return <Frame><DragSurface>
        <div className="flex shrink-0 items-center justify-between gap-2"><ActivityIntroduction narration={narration} className="flex-1"><h2 className="text-lg font-semibold">Label the tree</h2></ActivityIntroduction><span className="shrink-0 text-sm text-blue-800">{Object.keys(answers).length} / 4 matched</span></div>
        <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-center gap-2 rounded-lg bg-blue-50 p-2">{["Leaf", "Root", "Split node", "Branch"].filter(part => !Object.values(answers).includes(part)).map(part => <DragChip key={part} id={part} label={`Label ${part}`}>{part}</DragChip>)}{finished && <span className="text-sm text-emerald-800">All labels placed.</span>}</div>
        <div className="flex min-h-0 flex-1 gap-3">
            <div className="flex w-44 shrink-0 flex-col justify-center gap-3">{letters.map((letter, index) => <DropTarget key={letter} label={`Label box ${letter}`} disabled={Boolean(answers[index])} onPlace={id => place(id, index)} className={`flex items-center gap-2 ${answers[index] ? "!border-emerald-300 !bg-emerald-50" : ""}`}><span className="lesson-part-marker">{letter}</span><span className="text-sm font-medium">{answers[index] ?? "Drop label"}</span></DropTarget>)}</div>
            <div className="lesson-tree" aria-label="Tree with parts A through D">
                <TreeEdges />
                <TreeNode x={50} y={10} width={47}><div className="lesson-question"><span className="lesson-part-marker mr-2">A</span>Petal length ≤ 2.5?</div></TreeNode>
                <span className="lesson-branch-label" style={{ left: "30%", top: "28%" }}><span className="lesson-part-marker mr-1">B</span> Yes</span>
                <span className="lesson-branch-label" style={{ left: "69%", top: "27%" }}>No</span>
                <TreeNode x={18} y={45} width={31}><div className="lesson-leaf"><span className="lesson-part-marker mr-2">D</span>Setosa</div></TreeNode>
                <TreeNode x={74} y={45} width={47}><div className="lesson-question"><span className="lesson-part-marker mr-2">C</span>Petal width ≤ 1.7?</div></TreeNode>
                <span className="lesson-branch-label" style={{ left: "62%", top: "66%" }}>Yes</span><span className="lesson-branch-label" style={{ left: "85%", top: "66%" }}>No</span>
                <TreeNode x={59} y={84} width={31}><div className="lesson-leaf">Versicolor</div></TreeNode><TreeNode x={89} y={84} width={21}><div className="lesson-leaf">Virginica</div></TreeNode>
            </div>
        </div>
        <Result success={finished}>{feedback}</Result>
    </DragSurface></Frame>;
}
