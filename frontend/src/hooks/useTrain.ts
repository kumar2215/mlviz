import { useVisualisation } from "@/store/useVisualisation";
import { useDataset } from "@/store/useDataset";
import { useVisualisationHistoryRecorder } from "@/hooks/useVisualisationHistoryRecorder";
import type { ModelOption } from "@/types/parameters";
import type { Parameters } from "@/types/page";
import { filterParameters } from "@/utils/conditions";
import { useEffect, useMemo, useRef, useState } from "react";

export default function useTrain(useModel: () => any, setShowAlert: (show: boolean) => void, parameters: Parameters) {
    const model = useModel();
    const activeDataset = useDataset(state => state.activeDataset);
    const { isLoading, data, train, getParameters, resetModelData } = model;
    const hasInitialized = useRef(false);

    // Try to get lastParams from the store (different models use different names)
    // Use useMemo to maintain stable reference
    const lastParams = useMemo(
        () =>
            (model as any).lastParams || (model as any).lastTrainedParams || {},
        [(model as any).lastParams, (model as any).lastTrainedParams],
    );

    // Get feature names from the model store (for KNN dynamic feature dropdowns)
    const featureNames = useMemo(() => {
        if (typeof (model as any).getFeatureNames === "function") {
            return (model as any).getFeatureNames();
        }
        // Fallback to metadata if available
        return data?.metadata?.feature_names || null;
    }, [model, data?.metadata?.feature_names]);

    const [options, setOptions] = useState<ModelOption[]>([]);
    const { updateParams } = useVisualisation();
    const { recordTrain } = useVisualisationHistoryRecorder();

    useEffect(() => {
        const fetchParameters = async () => {
            const response = await getParameters();
            setOptions(filterParameters(response, parameters));
        };

        fetchParameters();
    }, []);

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
    }, [parameters, train, resetModelData, (model as any).loadVisualization, activeDataset]);


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
