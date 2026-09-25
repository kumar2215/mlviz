import { useStory } from "@/store/useStory";
import { useVisualisation } from "@/store/useVisualisation";

export default function useUserMode() {
    const currentStory = useStory.getState().currentStory;
    const currentVisualisation = useVisualisation.getState().currentVisualisation;

    if (currentStory !== null && currentVisualisation === null) {
        return { userMode: "story" as const, item: currentStory, hook: useStory };
    } else if (currentStory === null && currentVisualisation !== null) {
        return { userMode: "visualisation" as const, item: currentVisualisation, hook: useVisualisation };
    } else {
        throw new Error("Invalid state: both currentStory and currentVisualisation are null or both are non-null.");
    }
}
