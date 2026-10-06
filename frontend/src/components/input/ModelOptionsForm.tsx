import ModelOptionWrapper from "@/components/input/ModelOptionWrapper";
import type { ModelOption } from "@/types/parameters";
interface ModelOptionsFormProps {
    options: ModelOption[];
    params: Record<string, any>;
    setParams: (newParams: Record<string, any>) => void;
    onTrainModel: () => void;
    isModelLoading: boolean;
    featureNames?: string[] | null;
    buttonLabel?: string;
}

const ModelOptionsForm = ({
    options,
    params,
    setParams,
    onTrainModel,
    isModelLoading,
    featureNames,
    buttonLabel = "Train Model",
}: ModelOptionsFormProps) => {
    return (
        <div className="flex flex-col gap-4">
            {options.map((option: ModelOption) => (
                <ModelOptionWrapper
                    option={option}
                    params={params}
                    setParams={setParams}
                    featureNames={featureNames}
                    key={option.name}
                />
            ))}

            <div>
                <button
                    onClick={onTrainModel}
                    disabled={isModelLoading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold rounded-md shadow-sm transition duration-100 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-xl my-2"
                >
                    {isModelLoading ? "Processing..." : buttonLabel}
                </button>
            </div>
        </div>
    );
};

export default ModelOptionsForm;
