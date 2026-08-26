import ModelOptionsForm from "@/components/input/ModelOptionsForm";
import { Results } from "@/components/results/Results";
import { TrainComponent } from "@/components/TrainComponent";
import { SuccessAlert } from "@/components/ui/CustomAlerts";
import { useModel } from "@/contexts/ModelContext";
import { useCurrentStory } from "@/store/useAppStore";
import { useHistoryRecorder } from "@/hooks/useHistoryRecorder";
import type { ModelOption } from "@/types/parameters";
import type { ModelPage as ModelPageProps, Parameters } from "@/types/story";
import { filterParameters } from "@/utils/conditions";
import { useEffect, useMemo, useRef, useState } from "react";

type TrainPageProps = Pick<
    ModelPageProps,
    "model_name" | "parameters" | "problem_type" | "dataset"
>;

const MODEL_BUTTON_LABELS: Record<string, string> = {
    kmeans: "Set Hyperparams",
};

const TrainPage: React.FC<TrainPageProps> = ({
    model_name,
    parameters,
    problem_type,
    dataset,
}) => {
    const model = useModel();
    const { isLoading, data, train, getParameters, resetModelData } = model;
    const hasInitialized = useRef(false);

    const buttonLabel = MODEL_BUTTON_LABELS[model_name.toLowerCase()] || "Train Model";

    // Try to get lastParams from context (different models use different names)
    // Use useMemo to maintain stable reference
    const lastParams = useMemo(
        () =>
            (model as any).lastParams || (model as any).lastTrainedParams || {},
        [(model as any).lastParams, (model as any).lastTrainedParams],
    );

    // Get feature names from model context (for KNN dynamic feature dropdowns)
    const featureNames = useMemo(() => {
        if (typeof (model as any).getFeatureNames === "function") {
            return (model as any).getFeatureNames();
        }
        // Fallback to metadata if available
        return data?.metadata?.feature_names || null;
    }, [(model as any).getFeatureNames, data?.metadata?.feature_names]);

    const [options, setOptions] = useState<ModelOption[]>([]);
    const { updateParams } = useCurrentStory();
    const { recordTrain } = useHistoryRecorder();

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
            dataset: (parameters as any)?.dataset || dataset,
        };
        
        // For a TrainPage, we always want to perform actual training if parameters are provided.
        // loadVisualization is more appropriate for VizOnlyPage or preview states where metrics are not needed.
        train(trainParams);
    }, [parameters, dataset, train, resetModelData, (model as any).loadVisualization]);

    const [showAlert, setShowAlert] = useState(false);

    const handleTrainModel = async () => {
        const result = await train(trainingParams);
        updateParams({ trainParams: trainingParams });
        recordTrain(trainingParams, result?.metrics);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 2000);
    };

    return (
        <div className="flex flex-row w-full h-full min-h-0 relative overflow-hidden bg-gray-200">
            {showAlert && (
                <SuccessAlert description="Model trained successfully." />
            )}

            <div className="shrink-0 w-40 shadow-lg overflow-auto p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-r border-gray-300">
                <ModelOptionsForm
                    optionsConfig={options}
                    params={trainingParams}
                    setParams={setTrainingParams}
                    onTrainModel={handleTrainModel}
                    isModelLoading={isLoading}
                    featureNames={featureNames}
                    buttonLabel={buttonLabel}
                />
            </div>

            <div className="flex-1 shadow-lg overflow-hidden bg-white">
                <TrainComponent
                    data={data}
                    componentName={model_name}
                />
            </div>

            <div className="shrink-0 h-full min-h-0 p-4 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 border-l border-gray-300 overflow-auto">
                <Results
                    problem_type={problem_type}
                    data={data as any}
                />
            </div>

        </div>
    );
};

export default TrainPage;
