import { useVisualisation } from "@/store/useVisualisation";
import { useVisualisationHistoryRecorder } from "@/hooks/useVisualisationHistoryRecorder";
import type { ModelOption } from "@/types/parameters";
import type { Parameters } from "@/types/page";
import { filterParameters } from "@/utils/conditions";
import { useEffect, useMemo, useRef, useState } from "react";

export default function useStep(useModel: () => any, parameters: Parameters) {
    const model = useModel();
    const { 
        isLoading,
        data,
        train,
        loadVisualization,
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
    const { updateParams } = useVisualisation();
    const { recordStep } = useVisualisationHistoryRecorder();

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
                dataset: (stepParams as any)?.dataset
            };
            loadVisualization(trainParams);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

    const handleApplyParams = async () => {
        // Applying parameters in Step mode resets the model and starts fresh
        resetModelData();
        // We wait a tick to ensure context state updates have propagated if needed, 
        // though our context now handles it via manual ref clearing.
        const trainParams = {
            ...stepParams,
            dataset: (stepParams as any)?.dataset
        };
        const result = await train(trainParams);
        updateParams({ trainParams: stepParams });
        recordStep(stepParams, (result as any)?.metrics);
    };

    return {
        options,
        params: stepParams,
        setParams: setStepParams,
        onTrainModel: handleApplyParams,
        isModelLoading: isLoading,
        featureNames
    };
}
