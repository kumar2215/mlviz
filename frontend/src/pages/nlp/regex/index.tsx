import { useEffect, useState } from "react";
import { loadRegexState, type RegexState } from "@/api/text_preprocessing";
import { useDataset } from "@/store/useDataset";
import type { IndexPageProps } from "@/types/page";
import RegexEditor from "./RegexEditor";
import RegexIntroduction from "./RegexIntroduction";
import PageLoading from "@/components/layout/PageLoading";
import useUserMode from "@/hooks/useUserMode";

const storyPresetIds = new Set(["word", "whitespace", "words_and_punctuation", "numbers", "social"]);

export default function IndexPage({ name, narration, subpageIndex = 0, replayKey = 0, onSubpageReady, onComplete, onTaskComplete, completedTasks }: IndexPageProps) {
    const { userMode } = useUserMode();
    const dataset = useDataset(state => state.activeDataset);
    const [data, setData] = useState<RegexState | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        if (name === "Regex Basics") return;
        if (dataset?.type !== "predefined_regex" && dataset?.type !== "custom_regex") return;
        let active = true;
        loadRegexState(dataset).then(result => { if (active) { setData(result); setError(""); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load regex examples."); });
        return () => { active = false; };
    }, [dataset, name]);
    if (name === "Regex Basics") return <RegexIntroduction key={replayKey} narration={narration} />;
    if (error) return <div role="alert" className="p-4">{error}</div>;
    if (!data) return <PageLoading label="Loading regex examples…" />;
    const editorData = userMode === "story" ? { ...data, options: data.options.filter(option => storyPresetIds.has(option.id)) } : data;
    switch (name) {
        case "Regex Playground": return <RegexEditor key={`play-${replayKey}`} narration={narration} data={editorData} />;
        case "Regex Challenges": {
            if (!onSubpageReady) break;
            const goal = data.goals[subpageIndex];
            if (!goal) return <div role="alert">Unknown regex objective.</div>;
            return <RegexEditor key={`${goal.id}-${replayKey}`} narration={narration} data={editorData} goal={goal} initiallyPassed={completedTasks?.includes(goal.id)} onComplete={() => {
                onTaskComplete?.(goal.id);
                onSubpageReady();
                if (subpageIndex === data.goals.length - 1) onComplete();
            }} />;
        }
    }
    return <div role="alert" className="p-4">Unknown regex page: {name}</div>;
}
