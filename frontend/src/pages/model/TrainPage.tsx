import ClassifierResults from "@/components/ClassifierResults";
import ModelOptionsForm from "@/components/input/ModelOptionsForm";
import { TrainComponent } from "@/components/TrainComponent";
import { SuccessAlert } from "@/components/ui/CustomAlerts";
import { useModel } from "@/contexts/ModelContext";
import { CurrentStoryContext } from "@/contexts/StoryContext";
import type { ModelOption } from "@/types/parameters";
import type { ModelPage as ModelPageProps, Parameters } from "@/types/story";
import { filterParameters } from "@/utils/conditions";
import { useContext, useEffect, useMemo, useState } from "react";

type TrainPageProps = Pick<
    ModelPageProps,
    "model_name" | "parameters" | "problem_type" | "dataset"
>;

const TrainPage: React.FC<TrainPageProps> = ({
    model_name,
    parameters,
    problem_type,
    dataset,
}) => {
    const model = useModel();
    const { isLoading, data, train, getParameters } = model;

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
    const context = useContext(CurrentStoryContext);
    if (!context) throw new Error("No context found.");
    const { updateParams } = context;

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
        const trainParams = {
            ...(parameters || {}),
            dataset: (parameters as any)?.dataset || dataset,
        };
        train(trainParams);
    }, [parameters, dataset, train]);

    const [showAlert, setShowAlert] = useState(false);

    const handleTrainModel = async () => {
        await train(trainingParams);
        updateParams({ trainParams: trainingParams });
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 2000);
    };

    return (
        <div className="flex flex-row w-full h-full relative overflow-hidden bg-gray-200">
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
                />
            </div>

            <div className="flex-1 shadow-lg overflow-hidden bg-white">
                <TrainComponent
                    data={data}
                    componentName={model_name}
                />
            </div>

            {problem_type === "classifier" && (
                <div className="shrink-0 p-4 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 border-l border-gray-300 overflow-auto">
                    <ClassifierResults
                        metrics={data?.metrics}
                        metadata={data?.metadata}
                    />
                </div>
            )}
        </div>
    );
};

export default TrainPage;
