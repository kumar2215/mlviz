import useUserMode from "@/hooks/useUserMode";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import type { ModelOption } from "@/types/parameters";
import type { Parameters } from "@/types/page";
import { filterParameters } from "@/utils/conditions";
import type { ModelSelectorHook } from "@/types/modelStore";
import { useShallow } from "zustand/react/shallow";
import { useEffect, useMemo, useRef, useState } from "react";

export default function useStep(useModel: ModelSelectorHook, parameters: Parameters) {
    const isLoading = useModel(state => state.isLoading);
    const train = useModel(state => state.train);
    const loadVisualization = useModel(state => state.loadVisualization);
    const getParameters = useModel(state => state.getParameters);
    const resetModelData = useModel(state => state.resetModelData);

    // Standardize lastParams access
    const storedParams = useModel(state => state.lastParams);
    const lastVisualizationParams = useModel(state => state.lastVisualizationParams);
    const lastParams = useMemo(
        () => storedParams || lastVisualizationParams || {},
        [storedParams, lastVisualizationParams]
    );

    // Get feature names for parameter mapping
    const featureNames = useModel(useShallow((state): string[] | null =>
        typeof state.getFeatureNames === "function"
            ? state.getFeatureNames()
            : state.data?.metadata?.feature_names || null,
    ));

    const [options, setOptions] = useState<ModelOption[]>([]);
    const { hook: useModeStore } = useUserMode();
    const updateParams = useModeStore(state => state.updateParams);
    const { recordStep } = useHistoryRecorder();

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
        // Zustand resets synchronously, so training reads the cleared state.
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
