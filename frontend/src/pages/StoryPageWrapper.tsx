import VisualisationPage from "./VisualisationPage";
import { useStory, setCurrentStory } from "@/store/useStory";
import { useLayoutEffect } from "react";
import type Story from "@/types/story";
import { useConfig } from "@/store/useConfig";

export default function StoryPageWrapper({ story }: { story: Story }) {
    const resolved = useConfig(state => state.resolvedStories[story.name]);
    const current = useStory(state => state.currentStory);
    useLayoutEffect(() => { if (resolved && current !== resolved) setCurrentStory(resolved); }, [resolved, current]);

    return resolved && current === resolved ? <VisualisationPage key={`story:${story.name}`} /> : null;
};
