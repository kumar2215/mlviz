import { useState } from "react";
import { checkPorterPlacement } from "@/api/text_preprocessing";
import { DragAndDrop, DragItem, DropArea } from "@/components/interaction/DragAndDrop";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { LabFrame, Status } from "../shared/LabFrame";
import WordsEditor from "../shared/WordsEditor";
import { usePorterExamples } from "./usePorterExamples";

export default function PorterFamilies({ completionButtonId }: { completionButtonId: string }) {
    const examples = usePorterExamples();
    const [placements, setPlacements] = useState<Record<string, string>>({});
    const [checking, setChecking] = useState(false);
    const [feedback, setFeedback] = useState("Group each word under its Porter stem.");
    const { recordButtonClick } = useHistoryRecorder();
    const finished = Boolean(examples.data) && Object.keys(placements).length === examples.data?.examples.length;
    const pending = checking || examples.pending;
    const place = async (word: string, stem: string) => {
        if (!examples.source || placements[word] || !examples.data?.examples.some(item => item.word === word)) return;
        setChecking(true);
        try {
            const result = await checkPorterPlacement(examples.source, word, stem);
            setFeedback(result.message);
            if (result.correct) {
                const next = { ...placements, [word]: stem }; setPlacements(next);
                if (Object.keys(next).length === examples.data.examples.length) { recordButtonClick(completionButtonId); setFeedback("All words are grouped correctly."); }
            }
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not check this placement."); }
        finally { setChecking(false); }
    };
    return <LabFrame><DragAndDrop>
        <h2 className="shrink-0 text-lg font-semibold">Group word forms by stem</h2>
        <WordsEditor value={examples.draft} onChange={examples.setDraft} pending={pending} onApply={async () => { if (await examples.apply()) { setPlacements({}); setFeedback("New word groups loaded."); } }} />
        <div className="flex min-h-14 max-h-24 shrink-0 flex-wrap justify-center gap-2 overflow-auto rounded-lg bg-violet-50 p-2">{examples.data?.examples.filter(item => !placements[item.word]).map(item => <DragItem key={item.word} id={item.word} label={`Word ${item.word}`} disabled={pending}>{item.word}</DragItem>)}{finished && <span className="text-sm text-emerald-800">All words placed.</span>}</div>
        <div className="grid min-h-0 flex-1 grid-cols-2 content-center gap-3">{examples.data?.groups.map(group => <DropArea key={group.stem} label={`Stem group ${group.stem}`} disabled={pending || finished} onPlace={word => place(word, group.stem)}><h3 className="font-mono font-semibold text-violet-950 break-all">{group.stem}</h3><div className="mt-2 flex flex-wrap gap-1">{Object.entries(placements).filter(([, stem]) => stem === group.stem).map(([word]) => <span key={word} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-sm break-all">{word}</span>)}</div></DropArea>)}</div>
        <Status success={finished}>{examples.error || feedback}</Status>
    </DragAndDrop></LabFrame>;
}
