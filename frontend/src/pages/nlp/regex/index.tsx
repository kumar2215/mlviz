import { useEffect, useState } from "react";
import { loadRegexState, type RegexState } from "@/api/text_preprocessing";
import { useDataset } from "@/store/useDataset";
import type { IndexPageProps } from "@/types/page";
import RegexEditor from "./RegexEditor";
import PageLoading from "@/components/layout/PageLoading";

export default function IndexPage({ name, subpageIndex = 0, replayKey = 0, onSubpageReady, onComplete }: IndexPageProps) {
    const dataset = useDataset(state => state.activeDataset);
    const [data, setData] = useState<RegexState | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        if (dataset?.type !== "predefined_regex" && dataset?.type !== "custom_regex") return;
        let active = true;
        loadRegexState(dataset).then(result => { if (active) { setData(result); setError(""); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load regex examples."); });
        return () => { active = false; };
    }, [dataset]);
    if (error) return <div role="alert" className="p-4">{error}</div>;
    if (!data) return <PageLoading label="Loading regex examples…" />;
    switch (name) {
        case "Regex Playground": return <RegexEditor key={`play-${replayKey}`} data={data} />;
        case "Regex Challenges": {
            if (!onSubpageReady) break;
            const goal = data.goals[subpageIndex];
            if (!goal) return <div role="alert">Unknown regex objective.</div>;
            return <RegexEditor key={`${goal.id}-${replayKey}`} data={data} goal={goal} onComplete={() => {
                onSubpageReady();
                if (subpageIndex === data.goals.length - 1) onComplete();
            }} />;
        }
    }
    return <div role="alert" className="p-4">Unknown regex page: {name}</div>;
}
