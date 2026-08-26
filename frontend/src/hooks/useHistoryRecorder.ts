/**
 * useHistoryRecorder
 *
 * Provides typed action-recording helpers that write into the active story's
 * history log via the Zustand story store.
 *
 * Safe to use outside of a story (e.g. standalone model pages) — all helpers
 * become no-ops when there is no active story.
 */

import { useCurrentStory } from "@/store/useAppStore";
import type { ActionType, HistoryEntry, Parameters } from "@/types/story";

export function useHistoryRecorder() {
    const context = useCurrentStory();
    // Return a no-op recorder when not inside a story
    const recordAction = context?.recordAction ?? (() => {});

    const record = (
        type: ActionType,
        extra?: Omit<HistoryEntry, "type" | "timestamp">
    ) => {
        recordAction({ type, timestamp: Date.now(), ...extra });
    };

    return {
        /** Record that the model was trained with the given parameters and metrics. */
        recordTrain: (params?: Parameters, metrics?: Record<string, number>) => 
            record("train", { params, metrics }),

        /** Record that a prediction was made with the given inputs. */
        recordPredict: (params?: Parameters) => record("predict", { params }),

        /** Record that one step was executed (e.g. a KMeans iteration) and its metrics. */
        recordStep: (params?: Parameters, metrics?: Record<string, number>) => 
            record("step", { params, metrics }),

        /** Record that the manual tree was evaluated. */
        recordManualEvaluate: (metrics?: Record<string, number>) => record("manual_evaluate", { metrics }),

        /** Record that a story page was visited. */
        recordPageVisit: (page_id: number) => record("page_visit", { page_id }),

        /** Record that a named button was clicked. */
        recordButtonClick: (button_id: string) =>
            record("button_click", { button_id }),
    };
}
