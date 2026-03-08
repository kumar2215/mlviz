/**
 * useHistoryRecorder
 *
 * Provides typed action-recording helpers that write into the active story's
 * history log via StoryContext.recordAction.
 *
 * Safe to use outside of a story (e.g. standalone model pages) — all helpers
 * become no-ops when there is no CurrentStoryContext in scope.
 */

import { CurrentStoryContext } from "@/contexts/StoryContext";
import type { ActionType, HistoryEntry, Parameters } from "@/types/story";
import { useContext } from "react";

export function useHistoryRecorder() {
    const context = useContext(CurrentStoryContext);
    // Return a no-op recorder when not inside a story
    const recordAction = context?.recordAction ?? (() => {});

    const record = (
        type: ActionType,
        extra?: Omit<HistoryEntry, "type" | "timestamp">
    ) => {
        recordAction({ type, timestamp: Date.now(), ...extra });
    };

    return {
        /** Record that the model was trained with the given parameters. */
        recordTrain: (params?: Parameters) => record("train", { params }),

        /** Record that a prediction was made with the given inputs. */
        recordPredict: (params?: Parameters) => record("predict", { params }),

        /** Record that one step was executed (e.g. a KMeans iteration). */
        recordStep: (params?: Parameters) => record("step", { params }),

        /** Record that the manual tree was evaluated. */
        recordManualEvaluate: () => record("manual_evaluate"),

        /** Record that a story page was visited. */
        recordPageVisit: (page_id: number) => record("page_visit", { page_id }),

        /** Record that a named button was clicked. */
        recordButtonClick: (button_id: string) =>
            record("button_click", { button_id }),
    };
}
