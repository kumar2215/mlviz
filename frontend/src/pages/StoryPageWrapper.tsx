import VisualisationPage from "./VisualisationPage";
import { useStory, setCurrentStory } from "@/store/useStory";
import { useVisualisation } from "@/store/useVisualisation";
import { useEffect } from "react";
import type Story from "@/types/story";
import { unrollStory } from "@/utils/storyReferences";

export default function StoryPageWrapper({ story }: { story: Story }) {
    useEffect(() => {
        const unrolledStory = unrollStory(story, { stories: useStory.getState().stories, visualisations: useVisualisation.getState().visualisations });
        setCurrentStory(unrolledStory);
    }, [story]);

    return <VisualisationPage key={`story:${story.name}`} />;
};
