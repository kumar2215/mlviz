import type { ActionType, HistoryEntry } from "@/types/history";
import type { Parameters } from "@/types/page";
import useUserMode from "@/hooks/useUserMode";
import { useMemo } from "react";

export default function useHistoryRecorder() {
    const { recordAction } = useUserMode().hook();

    return useMemo(() => {
        const record = (
            type: ActionType,
            extra?: Omit<HistoryEntry, "actionType" | "timestamp">
        ) => {
            recordAction({ actionType: type, timestamp: Date.now(), ...extra });
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
    }, [recordAction]);
}
