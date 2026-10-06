import useUserMode from "@/hooks/useUserMode";
import { useDataset } from "@/store/useDataset";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import type { ModelOption } from "@/types/parameters";
import type { Parameters } from "@/types/page";
import { filterParameters } from "@/utils/conditions";
import type { ModelSelectorHook } from "@/types/modelStore";
import { useShallow } from "zustand/react/shallow";
import { useEffect, useMemo, useRef, useState } from "react";

export default function useTrain(useModel: ModelSelectorHook, setShowAlert: (show: boolean) => void, parameters: Parameters) {
    const isLoading = useModel(state => state.isLoading);
    const train = useModel(state => state.train);
    const getParameters = useModel(state => state.getParameters);
    const resetModelData = useModel(state => state.resetModelData);
    const activeDataset = useDataset(state => state.activeDataset);
    const hasInitialized = useRef(false);

    // Try to get lastParams from the store (different models use different names)
    // Use useMemo to maintain stable reference
    const storedParams = useModel(state => state.lastParams);
    const lastTrainedParams = useModel(state => state.lastTrainedParams);
    const lastParams = useMemo(
        () => storedParams || lastTrainedParams || {},
        [storedParams, lastTrainedParams],
    );

    // Get feature names from the model store (for KNN dynamic feature dropdowns)
    const featureNames = useModel(useShallow((state): string[] | null =>
        typeof state.getFeatureNames === "function"
            ? state.getFeatureNames()
            : state.data?.metadata?.feature_names || null,
    ));

    const [options, setOptions] = useState<ModelOption[]>([]);
    const { hook: useModeStore } = useUserMode();
    const updateParams = useModeStore(state => state.updateParams);
    const { recordTrain } = useHistoryRecorder();

    useEffect(() => {
        const fetchParameters = async () => {
            const response = await getParameters();
            setOptions(filterParameters(response, parameters));
        };

        fetchParameters();
    }, [getParameters, parameters]);

    const [trainingParams, setTrainingParams] = useState<Parameters>(
        parameters == null ? lastParams : parameters,
    );

    useEffect(() => {
        if (parameters == null) {
            setTrainingParams(lastParams);
        }
    }, [lastParams, parameters]);

    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            resetModelData();
        }
        
        const trainParams = {
            ...(parameters || {}),
            dataset: (parameters as any)?.dataset
        };
        
        // For a TrainPage, we always want to perform actual training if parameters are provided.
        // loadVisualization is more appropriate for VizOnlyPage or preview states where metrics are not needed.
        train(trainParams);
    }, [parameters, train, resetModelData, activeDataset]);


    const handleTrainModel = async () => {
        const result = await train(trainingParams);
        updateParams({ trainParams: trainingParams });
        recordTrain(trainingParams, (result as any)?.metrics);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 2000);
    };

    return {
        options,
        params: trainingParams,
        setParams: setTrainingParams,
        onTrainModel: handleTrainModel,
        isModelLoading: isLoading,
        featureNames
    };
}
