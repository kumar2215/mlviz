import { useDecisionTree } from "@/store/traditional_ml/useDecisionTree";
import DecisionTree from "@/pages/traditional_ml/decision_tree/DecisionTreeVisualization";
import ClassifierResults from "@/components/results/ClassifierResults";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { useEffect } from "react";
import { pathwayStore } from "@/store/usePathway";
import { progressStore } from "@/store/useProgress";
import { isConditionMet } from "@/utils/conditions";
import type { IndexPageProps, Parameters } from "@/types/page";
import type { ClassificationMetrics } from "@/types/model";

export default function DecisionTreePage({ onTaskComplete, onComplete }: Pick<IndexPageProps, "onTaskComplete" | "onComplete">) {
    const currentModelData = useDecisionTree(state => state.currentModelData);
    const resetModelData = useDecisionTree(state => state.resetModelData);
    const { recordManualEvaluate } = useHistoryRecorder();

    useEffect(() => {
        resetModelData();
    }, [resetModelData]);

    useEffect(() => {
        const context = pathwayStore.getState();
        const epoch = progressStore.getState().epoch;
        const report = (metrics: ClassificationMetrics) => {
            const state = pathwayStore.getState();
            if (state.sessionId !== context.sessionId || state.replayKey !== context.replayKey || state.currentPageId !== context.currentPageId || progressStore.getState().epoch !== epoch) return;
            recordManualEvaluate(metrics, state.currentPageId);
            const history = { params: {}, path: [], entries: [{ actionType: "manual_evaluate" as const, timestamp: Date.now(), page_id: state.currentPageId, metrics }] };
            if (state.transitions.some(edge => edge.from === state.currentPageId && edge.condition.condition_type === "Metric"
                && isConditionMet(edge.condition, { __history: history } as unknown as Record<string, Parameters>, { sourcePageId: state.currentPageId }))) { onTaskComplete?.("accuracy-target"); onComplete(); }
        };
        useDecisionTree.setState({ manualEvaluationListener: report });
        return () => { if (useDecisionTree.getState().manualEvaluationListener === report) useDecisionTree.setState({ manualEvaluationListener: null }); };
    }, [recordManualEvaluate, onTaskComplete, onComplete]);

    return (
        <div className="grid grid-cols-10 mx-auto w-full h-full">
            <div data-tour-surface className="relative col-span-8 shadow-lg overflow-hidden bg-white min-h-0">
                <DecisionTree />
            </div>

            <div className="col-span-2 p-4 shadow-lg bg-gradient-to-br from-blue-50 to-blue-50 min-h-0">
                {currentModelData && (
                    <ClassifierResults
                        metrics={currentModelData.metrics}
                        metadata={currentModelData.metadata as any}
                    />
                )}
            </div>
        </div>
    );
};
