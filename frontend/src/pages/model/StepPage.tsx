import ModelOptionsForm from "@/components/input/ModelOptionsForm";
import { StepComponent } from "@/components/StepComponent";
import { useModel } from "@/contexts/ModelContext";
import { CurrentStoryContext } from "@/contexts/StoryContext";
import type { ModelOption } from "@/types/parameters";
import type { ModelPage as ModelPageProps, Parameters } from "@/types/story";
import { filterParameters } from "@/utils/conditions";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

type StepPageProps = Pick<
    ModelPageProps,
    "model_name" | "parameters" | "problem_type" | "dataset"
>;

const StepPage: React.FC<StepPageProps> = ({
    model_name,
    parameters,
    dataset,
}) => {
    const model = useModel();
    const { 
        isLoading, 
        data, 
        train, 
        getParameters,
        resetModelData
    } = model;

    // Standardize lastParams access
    const lastParams = useMemo(
        () => (model as any).lastParams || (model as any).lastVisualizationParams || {},
        [(model as any).lastParams, (model as any).lastVisualizationParams]
    );

    // Get feature names for parameter mapping
    const featureNames = useMemo(() => {
        if (typeof (model as any).getFeatureNames === "function") {
            return (model as any).getFeatureNames();
        }
        return data?.metadata?.feature_names || null;
    }, [model, data?.metadata?.feature_names]);

    const [options, setOptions] = useState<ModelOption[]>([]);
    const context = useContext(CurrentStoryContext);
    if (!context) throw new Error("No context found.");
    const { updateParams } = context;

    const [stepParams, setStepParams] = useState<Parameters>(
        parameters == null ? lastParams : parameters
    );

    // Fetch parameter definitions
    useEffect(() => {
        const fetchParameters = async () => {
            const response = await getParameters();
            setOptions(filterParameters(response, parameters));
        };
        fetchParameters();
    }, [getParameters, parameters]);

    // Sync params with story updates
    useEffect(() => {
        if (parameters == null) {
            setStepParams(lastParams);
        }
    }, [lastParams, parameters]);

    // Auto-load dataset on mount when there is no existing model data.
    // This populates the scatter plot immediately so the user can start
    // placing centroids without having to click "Apply Parameters" first.
    const autoLoadDone = useRef(false);
    useEffect(() => {
        if (!autoLoadDone.current) {
            autoLoadDone.current = true;
            resetModelData(); // Always start fresh when the step page mounts
            const trainParams = {
                ...stepParams,
                dataset: (stepParams as any)?.dataset || dataset,
            };
            train(trainParams);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

    const handleApplyParams = async () => {
        // Applying parameters in Step mode resets the model and starts fresh
        console.log("[StepPage] Applying parameters and resetting data");
        resetModelData();
        // We wait a tick to ensure context state updates have propagated if needed, 
        // though our context now handles it via manual ref clearing.
        const trainParams = {
            ...stepParams,
            dataset: (stepParams as any)?.dataset || dataset,
        };
        await train(trainParams);
        updateParams({ trainParams: stepParams });
    };

    return (
        <div className="grid grid-cols-10 mx-auto w-full h-full relative">
            {/* Standard Parameters Sidebar */}
            <div className="col-span-2 shadow-lg justify-between overflow-auto p-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-0">
                <ModelOptionsForm
                    optionsConfig={options}
                    params={stepParams}
                    setParams={setStepParams}
                    onTrainModel={handleApplyParams}
                    isModelLoading={isLoading}
                    featureNames={featureNames}
                    buttonLabel="Apply Parameters"
                />
            </div>

            {/* Main Interactive Step Area */}
            <div className="col-span-8 shadow-lg overflow-hidden relative bg-white min-h-0">
                <StepComponent
                    data={data}
                    componentName={model_name}
                />
            </div>
        </div>
    );
};

export default StepPage;
