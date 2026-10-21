import { useMemo } from "react";
import { useConfig } from "@/store/useConfig";
import { useProgress } from "@/store/useProgress";
import { activeBucket } from "@/store/progressStore";
import { levelProgress, storyXp } from "@/lib/storyProgress";

export default function useLearningSummary() {
    const catalog = useConfig(state => state.resolvedStories);
    const perLevel = useConfig(state => state.config?.xp_per_level ?? 100);
    const bucket = useProgress(activeBucket);
    return useMemo(() => {
        const stories = Object.fromEntries(Object.values(catalog).map(story => [story.name, storyXp(story, bucket.stories[story.name])]));
        const xp = Object.values(stories).reduce((sum, story) => sum + story.earned, 0);
        return { stories, xp, ...levelProgress(xp, perLevel) };
    }, [catalog, bucket, perLevel]);
}
