import { useState } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import type { ActivityNarrationProps } from "@/types/page";
import { calculateNodeStats } from "@/api/dt";
import { Button } from "@/components/ui/button";
import { useDataset } from "@/store/useDataset";
import type { components } from "@/types/api";
import { choiceClass, Frame, Result, selectedClass } from "./shared";

type NodeResponse = components["schemas"]["ManualNodeStatsResponse"];
type NodeStats = components["schemas"]["NodeStatistics"];
const colors = ["#818cf8", "#38bdf8", "#34d399"];

function Branch({ label, stats }: { label: string; stats?: NodeStats }) {
    return <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-2">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        {stats ? <>
            <p className="text-sm font-semibold">{stats.samples} flowers</p>
            <div className="my-1 flex h-2 overflow-hidden rounded-full bg-slate-100">{Object.entries(stats.class_probabilities).map(([name, probability], index) => <span key={name} style={{ width: `${probability * 100}%`, background: colors[index % colors.length] }} />)}</div>
            {Object.entries(stats.class_distribution).map(([name, count], index) => <p key={name} className="flex justify-between gap-1 text-xs"><span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: colors[index % colors.length] }} />{name}</span><strong>{count}</strong></p>)}
            <p className="mt-1 text-xs text-slate-600">Gini: {stats.impurity.toFixed(3)}</p>
        </> : <p className="py-5 text-xs text-slate-500">Recalculate to see flowers</p>}
    </div>;
}

export default function CompareIrisSplits({ narration, onComplete }: ActivityNarrationProps & { onComplete: () => void }) {
    const dataset = useDataset(state => state.activeDataset);
    const [thresholds, setThresholds] = useState([2.5, 4.5]);
    const [results, setResults] = useState<(NodeResponse | null)[]>([null, null]);
    const [pending, setPending] = useState<number | null>(null);
    const [feedback, setFeedback] = useState("Recalculate both questions, then choose the better split.");
    const [finished, setFinished] = useState(false);

    const updateThreshold = (index: number, value: number) => {
        setThresholds(previous => previous.map((threshold, i) => i === index ? value : threshold));
        setResults(previous => previous.map((result, i) => i === index ? null : result));
        setFeedback("Threshold changed. Recalculate this split before comparing.");
    };

    const inspect = async (index: number) => {
        if (dataset?.type !== "predefined" || dataset.name !== "iris") {
            setFeedback("The Iris dataset is unavailable. Go back and reopen this page.");
            return;
        }
        const threshold = thresholds[index];
        if (!Number.isFinite(threshold) || threshold < 1 || threshold > 7) {
            setFeedback("Use a petal-length threshold between 1 and 7 cm.");
            return;
        }
        setPending(index);
        setResults(previous => previous.map((result, i) => i === index ? null : result));
        try {
            const result = await calculateNodeStats({ feature: "petal length (cm)", threshold, criterion: "gini", dataset });
            setResults(previous => previous.map((item, i) => i === index ? result : item));
            setFeedback("Split recalculated from the Iris dataset.");
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : "Could not calculate this split.");
        } finally {
            setPending(null);
        }
    };

    const choose = (index: number) => {
        if (pending !== null || !results[0] || !results[1]) return;
        const gains = results.map(result => result!.split_stats.information_gain);
        const tied = Math.abs(gains[0] - gains[1]) < 1e-9;
        if (gains[index] + 1e-9 < Math.max(...gains)) {
            setFeedback("Choose the split with the larger information gain.");
            return;
        }
        setFeedback(tied ? "Both splits have equal gain, so either is equally good. The next page is unlocked." : `Correct. Split ${index === 0 ? "A" : "B"} reduces impurity more. The next page is unlocked.`);
        if (!finished) { setFinished(true); onComplete(); }
    };

    return <Frame>
        <ActivityIntroduction narration={narration}><h2 className="shrink-0 text-lg font-semibold">Compare two petal-length questions</h2></ActivityIntroduction>
        <div aria-label="Split comparisons" className="grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto xl:grid-cols-2">{thresholds.map((threshold, index) => {
            const stats = results[index]?.split_stats;
            return <section key={index} className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-slate-50 p-3" aria-label={`Split ${index === 0 ? "A" : "B"}`}>
                <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-blue-900">Split {index === 0 ? "A" : "B"}</h3><label className="flex items-center gap-1 text-xs">Threshold<input aria-label={`Split ${index === 0 ? "A" : "B"} threshold`} className="w-16 rounded-md border border-blue-300 bg-white px-2 py-1 text-sm" type="number" min="1" max="7" step="0.1" value={Number.isFinite(threshold) ? threshold : ""} disabled={pending !== null} onChange={event => updateThreshold(index, event.target.valueAsNumber)} />cm</label></div>
                <input aria-label={`Adjust split ${index === 0 ? "A" : "B"} threshold`} className="w-full shrink-0 accent-blue-600" type="range" min="1" max="7" step="0.1" value={Number.isFinite(threshold) ? threshold : 1} disabled={pending !== null} onChange={event => updateThreshold(index, event.target.valueAsNumber)} />
                <div className="lesson-question shrink-0">Petal length ≤ {Number.isFinite(threshold) ? threshold.toFixed(1) : "?"} cm?</div>
                <div className="lesson-split-branches grid grid-cols-2 gap-2"><Branch label="Yes · left" stats={stats?.left_stats} /><Branch label="No · right" stats={stats?.right_stats} /></div>
                <div className="flex min-h-14 flex-1 flex-col justify-center rounded-lg bg-blue-50 px-2 py-1 text-center">
                    {stats ? <><p className="text-xs text-blue-900">{stats.parent_stats.impurity.toFixed(3)} − ({stats.left_stats.samples}/{stats.parent_stats.samples}) × {stats.left_stats.impurity.toFixed(3)} − ({stats.right_stats.samples}/{stats.parent_stats.samples}) × {stats.right_stats.impurity.toFixed(3)}</p><p className="font-semibold text-blue-950">Gain = {stats.information_gain.toFixed(3)}</p></> : <span className="text-xs text-slate-500">Gain not yet calculated</span>}
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2"><Button className={choiceClass} disabled={pending !== null} onClick={() => inspect(index)}>{pending === index ? "Calculating…" : "Recalculate"}</Button><Button className={selectedClass} disabled={pending !== null || !results[0] || !results[1]} onClick={() => choose(index)}>Choose {index === 0 ? "A" : "B"}</Button></div>
            </section>;
        })}</div>
        <Result success={finished}>{feedback}</Result>
    </Frame>;
}
