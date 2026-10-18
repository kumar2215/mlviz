import { useState } from "react";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { DragChip, DragSurface, DropTarget, FlowerIcon, Frame, Result, TreeEdges, TreeNode } from "./shared";

const flowers = [
    { id: "F1", length: 1.5, width: 0.3 },
    { id: "F2", length: 4.5, width: 1.4 },
    { id: "F3", length: 6.0, width: 2.1 },
    { id: "F4", length: 1.8, width: 0.4 },
    { id: "F5", length: 5.5, width: 2.0 },
    { id: "F6", length: 4.1, width: 1.3 },
];
type Side = "left" | "right";

function FlowerGroup({ ids }: { ids: string[] }) {
    return <div className="mt-1 flex flex-wrap justify-center gap-1">{ids.map(id => <span key={id} className="flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs"><FlowerIcon small />{id}</span>)}</div>;
}

export default function FollowQuestions({ completionButtonId }: { completionButtonId: string }) {
    const [stage, setStage] = useState(0);
    const [rootGroups, setRootGroups] = useState<Record<string, Side>>({});
    const [childGroups, setChildGroups] = useState<Record<string, Side>>({});
    const [feedback, setFeedback] = useState("Sort all six flowers at the root.");
    const { recordButtonClick } = useHistoryRecorder();
    const finished = stage === 2;
    const activeFlowers = flowers.filter(flower => stage === 0 ? !rootGroups[flower.id] : stage === 1 && rootGroups[flower.id] === "right" && !childGroups[flower.id]);
    const rootLeft = flowers.filter(flower => rootGroups[flower.id] === "left").map(flower => flower.id);
    const rootRight = flowers.filter(flower => rootGroups[flower.id] === "right").map(flower => flower.id);
    const childIds = (side: Side) => flowers.filter(flower => childGroups[flower.id] === side).map(flower => flower.id);

    const place = (id: string, side: Side) => {
        const flower = activeFlowers.find(item => item.id === id);
        if (!flower || finished) return;
        const value = stage === 0 ? flower.length : flower.width;
        const threshold = stage === 0 ? 2.5 : 1.7;
        const correct = value <= threshold ? "left" : "right";
        if (side !== correct) {
            setFeedback(`${id}: ${value.toFixed(1)} ${correct === "left" ? "≤" : ">"} ${threshold}. Try the ${correct} branch.`);
            return;
        }
        if (stage === 0) {
            const next = { ...rootGroups, [id]: side };
            setRootGroups(next);
            if (Object.keys(next).length === flowers.length) {
                setStage(1);
                setFeedback("Root split complete. Sort the four remaining flowers by petal width.");
            } else setFeedback(`${id} follows the ${side} branch. Keep sorting the root.`);
        } else {
            const next = { ...childGroups, [id]: side };
            setChildGroups(next);
            if (Object.keys(next).length === rootRight.length) {
                setStage(2);
                setFeedback("All six flowers reached their species leaves. The next page is unlocked.");
                recordButtonClick(completionButtonId);
            } else setFeedback(`${id} reached a leaf. Sort the remaining flowers.`);
        }
    };

    return <Frame><DragSurface>
        <div className="flex shrink-0 items-center justify-between gap-2"><h2 className="text-lg font-semibold">Sort the flowers</h2><span className="text-sm font-medium text-blue-800">{finished ? "6 / 6 at leaves" : stage === 0 ? "Root split" : "Petal-width split"}</span></div>
        <div className="flex min-h-20 shrink-0 flex-wrap items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2" aria-label="Flowers to sort">
            {activeFlowers.map(flower => <DragChip key={flower.id} id={flower.id} label={`Flower ${flower.id}: length ${flower.length}, width ${flower.width}`}><FlowerIcon /><span className="text-left"><strong>{flower.id}</strong><span className="block text-xs">L {flower.length.toFixed(1)} · W {flower.width.toFixed(1)} cm</span></span></DragChip>)}
            {finished && <span className="text-sm font-medium text-emerald-800">Every flower is in a leaf below.</span>}
        </div>
        <div className="lesson-tree" aria-label="Flower classification tree">
            <TreeEdges expanded={stage > 0} />
            <TreeNode x={50} y={10} width={37}><div className={`lesson-question ${stage === 0 ? "lesson-question-active" : ""}`}>Petal length ≤ 2.5 cm?</div></TreeNode>
            <span className="lesson-branch-label" style={{ left: "30%", top: "29%" }}>Yes · left</span>
            <span className="lesson-branch-label" style={{ left: "65%", top: "28%" }}>No · right</span>
            <TreeNode x={18} y={45} width={30}>{stage === 0 ? <DropTarget label="Root left branch" onPlace={id => place(id, "left")}><strong>Yes · left</strong><FlowerGroup ids={rootLeft} /></DropTarget> : <div className="lesson-leaf"><strong>Setosa</strong><FlowerGroup ids={rootLeft} /></div>}</TreeNode>
            <TreeNode x={74} y={45} width={38}>{stage === 0 ? <DropTarget label="Root right branch" onPlace={id => place(id, "right")}><strong>No · right</strong><FlowerGroup ids={rootRight} /></DropTarget> : <div className={`lesson-question ${stage === 1 ? "lesson-question-active" : ""}`}>Petal width ≤ 1.7 cm?</div>}</TreeNode>
            {stage > 0 && <>
                <span className="lesson-branch-label" style={{ left: "61%", top: "65%" }}>Yes · left</span>
                <span className="lesson-branch-label" style={{ left: "87%", top: "65%" }}>No · right</span>
                <TreeNode x={59} y={84} width={27}><DropTarget label="Petal-width left branch" disabled={finished} className={finished ? "lesson-leaf" : ""} onPlace={id => place(id, "left")}><strong>{finished ? "Versicolor" : "Yes · left"}</strong><FlowerGroup ids={childIds("left")} /></DropTarget></TreeNode>
                <TreeNode x={89} y={84} width={21}><DropTarget label="Petal-width right branch" disabled={finished} className={finished ? "lesson-leaf" : ""} onPlace={id => place(id, "right")}><strong>{finished ? "Virginica" : "No · right"}</strong><FlowerGroup ids={childIds("right")} /></DropTarget></TreeNode>
            </>}
        </div>
        <Result success={finished}>{feedback}</Result>
    </DragSurface></Frame>;
}
