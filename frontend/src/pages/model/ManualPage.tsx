import { ManualComponent } from "@/components/ManualComponent";
import { Results } from "@/components/results/Results";
import { useModel } from "@/contexts/ModelContext";
import { useHistoryRecorder } from "@/hooks/useHistoryRecorder";
import type { ModelPage as ModelPageProps } from "@/types/story";
import React, { useEffect, useRef } from "react";

type ManualPageProps = Pick<
    ModelPageProps,
    "model_name" | "parameters" | "dataset" | "problem_type"
>;

const ManualPage: React.FC<ManualPageProps> = ({
    model_name,
    problem_type,
}) => {
    console.log("[ManualPage] ", problem_type);

    const { currentModelData, resetModelData } = useModel();

    const { recordManualEvaluate } = useHistoryRecorder();

    // Track whether the initial model data has been set so we don't fire on mount
    const hasInitialData = useRef(false);

    useEffect(() => {
        resetModelData();
    }, []);

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
    }, [currentModelData?.metrics]);

    console.log(currentModelData);
    return (
        <div className="grid grid-cols-10 mx-auto w-full h-full">
            <div className="col-span-8 shadow-lg overflow-hidden min-h-0">
                <ManualComponent componentName={model_name} />
            </div>

            <div className="col-span-2 p-4 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 min-h-0">
                {currentModelData && (
                    <Results
                        problem_type={problem_type}
                        data={currentModelData as any}
                    />
                )}
            </div>
        </div>
    );
};

export default ManualPage;
