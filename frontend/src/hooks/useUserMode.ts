import { useStory } from "@/store/useStory";
import { useVisualisation } from "@/store/useVisualisation";
import type Story from "@/types/story";
import type Visualisation from "@/types/visualisation";

type ModeActions = Pick<
    ReturnType<typeof useStory.getState>,
    "addPageVisit" | "getPreviousPageId" | "recordAction" | "updateParams"
>;
type ModeSelectorHook = <Selected>(selector: (state: ModeActions) => Selected) => Selected;
type UserMode =
    | { userMode: "story"; item: Story; hook: ModeSelectorHook }
    | { userMode: "visualisation"; item: Visualisation; hook: ModeSelectorHook };

export default function useUserMode(): UserMode {
    const currentStory = useStory(state => state.currentStory);
    const currentVisualisation = useVisualisation(state => state.currentVisualisation);

    if (currentStory !== null && currentVisualisation === null) {
        return { userMode: "story" as const, item: currentStory, hook: useStory };
    } else if (currentStory === null && currentVisualisation !== null) {
        return { userMode: "visualisation" as const, item: currentVisualisation, hook: useVisualisation };
    } else {
        throw new Error("Invalid state: both currentStory and currentVisualisation are null or both are non-null.");
    }
}
