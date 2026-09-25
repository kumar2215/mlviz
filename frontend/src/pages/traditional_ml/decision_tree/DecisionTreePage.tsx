import { useDecisionTree } from "@/store/traditional_ml/useDecisionTree";
import DecisionTree from "@/pages/traditional_ml/decision_tree/DecisionTreeVisualization";
import ClassifierResults from "@/components/results/ClassifierResults";
import { useVisualisationHistoryRecorder } from "@/hooks/useVisualisationHistoryRecorder";
import { useEffect, useRef } from "react";

export default function DecisionTreePage() {
    const { currentModelData, resetModelData } = useDecisionTree();
    const { recordManualEvaluate } = useVisualisationHistoryRecorder();

    // Track whether the initial model data has been set so we don't fire on mount
    const hasInitialData = useRef(false);

    useEffect(() => {
        resetModelData();
    }, [resetModelData]);

    // Record a manual_evaluate action each time the user causes a tree evaluation
    // (metrics change after the initial reset, i.e. after the first split/mark-as-leaf)
    useEffect(() => {
        if (currentModelData?.metrics) {
            if (hasInitialData.current) {
                recordManualEvaluate(currentModelData.metrics as any);
            } else {
                hasInitialData.current = true;
            }
        }
    }, [currentModelData?.metrics, recordManualEvaluate]);

    return (
        <div className="grid grid-cols-10 mx-auto w-full h-full">
            <div className="col-span-8 shadow-lg overflow-hidden min-h-0">
                <DecisionTree />
            </div>

            <div className="col-span-2 p-4 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 min-h-0">
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
