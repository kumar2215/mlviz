import { useStory } from "./useStory";
import { useVisualisation } from "./useVisualisation";
import type { PathwayHistorySource } from "./pathwayStore";

export function pathwayHistorySource(mode: "story" | "visualisation"): PathwayHistorySource {
    if (mode === "story") return {
        reset: () => useStory.setState(state => ({ currentStoryHistory: { story_id: state.currentStory?.name ?? "", params: {}, entries: [], path: [] } })),
        getHistory: () => useStory.getState().currentStoryHistory,
        subscribe: listener => useStory.subscribe((state, previous) => {
            if (state.currentStoryHistory !== previous.currentStoryHistory) listener(state.currentStoryHistory);
        }),
        addPageVisit: pageId => useStory.getState().addPageVisit(pageId),
        recordAction: entry => useStory.getState().recordAction(entry),
    };
    return {
        getHistory: () => useVisualisation.getState().currentVisualisationHistory,
        subscribe: listener => useVisualisation.subscribe((state, previous) => {
            if (state.currentVisualisationHistory !== previous.currentVisualisationHistory) listener(state.currentVisualisationHistory);
        }),
        addPageVisit: pageId => useVisualisation.getState().addPageVisit(pageId),
        recordAction: entry => useVisualisation.getState().recordAction(entry),
    };
}
