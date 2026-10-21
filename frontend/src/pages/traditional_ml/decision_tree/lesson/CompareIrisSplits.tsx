import { useEffect, useState } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import type { IndexPageProps } from "@/types/page";
import { calculateNodeStats } from "@/api/dt";
import { Button } from "@/components/ui/button";
import { useDataset } from "@/store/useDataset";
import type { ActiveDataset } from "@/types/dataset";
import type { components } from "@/types/api";
import { Frame, Result, selectedClass } from "./shared";

type NodeResponse = components["schemas"]["ManualNodeStatsResponse"];
type NodeStats = components["schemas"]["NodeStatistics"];
const colors = ["#818cf8", "#38bdf8", "#34d399"];
const variableSplits = [
    { feature: "sepal length (cm)", label: "Sepal length", threshold: 5.5 },
    { feature: "petal length (cm)", label: "Petal length", threshold: 2.5 },
];
const thresholdSplits = [2.5, 4.5].map(threshold => ({ ...variableSplits[1], threshold }));

function useSplitStats(feature: string, threshold: number) {
    const dataset = useDataset(state => state.activeDataset);
    const [response, setResponse] = useState<{
        dataset: ActiveDataset;
        feature: string;
        threshold: number;
        result?: NodeResponse;
        error?: string;
    } | null>(null);
    useEffect(() => {
        if (dataset?.type !== "predefined" || dataset.name !== "iris") return;
        let cancelled = false;
        const inspect = async () => {
            try {
                const result = await calculateNodeStats({ feature, threshold, criterion: "gini", dataset });
                if (!cancelled) setResponse({ dataset, feature, threshold, result });
            } catch (error) {
                if (!cancelled) setResponse({ dataset, feature, threshold, error: error instanceof Error ? error.message : "Could not calculate this split." });
            }
        };
        void inspect();
        return () => { cancelled = true; };
    }, [dataset, feature, threshold]);

    const current = response?.dataset === dataset && response?.feature === feature && response?.threshold === threshold ? response : null;
    const error = dataset?.type !== "predefined" || dataset.name !== "iris" ? "The Iris dataset is unavailable. Go back and reopen this page."
        : current?.error;
    return { result: current?.result, error };
}

function Branch({ label, stats, placeholder }: { label: string; stats?: NodeStats; placeholder: string }) {
    return <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-2">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        {stats ? <>
            <p className="text-sm font-semibold">{stats.samples} flowers</p>
            <div className="my-1 flex h-2 overflow-hidden rounded-full bg-slate-100">{Object.entries(stats.class_probabilities).map(([name, probability], index) => <span key={name} style={{ width: `${probability * 100}%`, background: colors[index % colors.length] }} />)}</div>
            {Object.entries(stats.class_distribution).map(([name, count], index) => <p key={name} className="flex justify-between gap-1 text-xs"><span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: colors[index % colors.length] }} />{name}</span><strong>{count}</strong></p>)}
            <p className="mt-1 text-xs text-slate-600">Gini: {stats.impurity.toFixed(3)}</p>
        </> : <p className="py-5 text-xs text-slate-500">{placeholder}</p>}
    </div>;
}

type Props = Pick<IndexPageProps, "narration" | "subpageIndex" | "onSubpageReady" | "onComplete" | "onTaskComplete" | "completedTasks">;

export default function CompareIrisSplits({ narration, subpageIndex = 0, onSubpageReady, onComplete, onTaskComplete, completedTasks = [] }: Props) {
    const compareVariables = subpageIndex === 0;
    const [feedback, setFeedback] = useState(() => completedTasks.includes(compareVariables ? "variables" : "thresholds") ? "This comparison was completed previously. Use Replay to practice again." : "");
    const [selected, setSelected] = useState<number | null>(null);
    const [finished, setFinished] = useState(() => completedTasks.includes(compareVariables ? "variables" : "thresholds"));
    const splits = compareVariables ? variableSplits : thresholdSplits;
    const first = useSplitStats(splits[0].feature, splits[0].threshold);
    const second = useSplitStats(splits[1].feature, splits[1].threshold);
    const results = [first, second];
    const ready = results.every(item => item.result && !item.error);

    const choose = (index: number) => {
        if (!ready) return;
        const gains = results.map(item => item.result!.split_stats.information_gain);
        const tied = Math.abs(gains[0] - gains[1]) < 1e-9;
        if (gains[index] + 1e-9 < Math.max(...gains)) {
            setFeedback("Choose the split with the larger information gain. It leaves less impurity in the two groups.");
            return;
        }
        setSelected(index);
        setFeedback(compareVariables
            ? "Correct. For these questions, petal length gives the larger gain. Continue to compare two thresholds for petal length."
            : tied ? "Both thresholds give equal gain, so either split is equally good. The next page is unlocked."
                : `Correct. Split ${index === 0 ? "A" : "B"} reduces impurity more. The next page is unlocked.`);
        if (!finished) {
            setFinished(true);
            onTaskComplete?.(compareVariables ? "variables" : "thresholds");
            onSubpageReady?.();
            if (!compareVariables) onComplete();
        }
    };

    return <Frame>
        <ActivityIntroduction narration={narration}><h2 className="shrink-0 text-lg font-semibold">Splitting Iris flowers</h2></ActivityIntroduction>
        <div className="shrink-0 rounded-lg bg-blue-50 px-3 py-2">
            <p className="text-sm font-semibold text-blue-950">{compareVariables ? "1 / 2 · Compare variables" : "2 / 2 · Compare thresholds"}</p>
            <p className="text-sm text-slate-600">{compareVariables
                ? "Compare sepal length with petal length. Which question separates the species better? Choose the greater gain to continue."
                : "Petal length gave the better split. Compare thresholds of 2.5 cm and 4.5 cm, then choose the greater gain."}</p>
        </div>
        <div aria-label={compareVariables ? "Variable comparisons" : "Threshold comparisons"} className="grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto xl:grid-cols-2">{splits.map(({ label, threshold }, index) => {
            const { result, error } = results[index];
            const stats = result?.split_stats;
            const letter = index === 0 ? "A" : "B";
            return <section key={index} className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-slate-50 p-3" aria-label={`Split ${letter}`} aria-busy={!stats && !error}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-blue-900">{compareVariables ? label : `Split ${letter}`}</h3>
                </div>
                <div>
                    <div className="lesson-question mx-auto w-4/5 text-center">{label} ≤ {threshold.toFixed(1)} cm?</div>
                    <svg aria-hidden="true" className="lesson-split-edges" viewBox="0 0 1000 80" preserveAspectRatio="none"><path d="M500 0 L245 80 M500 0 L755 80" /></svg>
                    <div className="grid grid-cols-2 gap-2"><Branch label="Yes · left" stats={stats?.left_stats} placeholder={error ? "Results unavailable" : "Calculating…"} /><Branch label="No · right" stats={stats?.right_stats} placeholder={error ? "Results unavailable" : "Calculating…"} /></div>
                </div>
                <div className="flex min-h-14 flex-1 flex-col justify-center rounded-lg bg-blue-50 px-2 py-1 text-center">
                    {stats ? <><p className="text-xs text-blue-900">{stats.parent_stats.impurity.toFixed(3)} − ({stats.left_stats.samples}/{stats.parent_stats.samples}) × {stats.left_stats.impurity.toFixed(3)} − ({stats.right_stats.samples}/{stats.parent_stats.samples}) × {stats.right_stats.impurity.toFixed(3)}</p><p className="font-semibold text-blue-950">Gain = {stats.information_gain.toFixed(3)}</p></> : error ? <p role="alert" className="text-xs text-red-700">{error}</p> : <span className="text-xs text-slate-500">Calculating gain…</span>}
                </div>
                <Button className={selectedClass} disabled={!ready || selected !== null} onClick={() => choose(index)}>{selected === index ? "Selected" : compareVariables ? `Choose ${label.toLowerCase()}` : `Choose ${letter}`}</Button>
            </section>;
        })}</div>
        <Result success={selected !== null}>{feedback || (ready ? "Compare the gains, then choose the better split." : "Calculating results from the Iris dataset.")}</Result>
    </Frame>;
}
