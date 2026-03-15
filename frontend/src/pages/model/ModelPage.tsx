import ManualPage from "@/pages/model/ManualPage";
import PredictPage from "@/pages/model/PredictPage";
import StepPage from "@/pages/model/StepPage";
import TrainPage from "@/pages/model/TrainPage";
import VizOnlyPage from "@/pages/model/VizOnlyPage";
import type { ModelPage as ModelPageType } from "@/types/story";

type ModelPageProps = Omit<
    ModelPageType,
    "dynamic_type" | "page_type" | "viz_only"
>;

const ModelPage: React.FC<ModelPageProps> = ({
    model_name,
    component_type,
    parameters,
    problem_type,
    dataset,
}) => {
    if (component_type == "predict") {
        return (
            <PredictPage
                model_name={model_name}
                parameters={parameters}
                dataset={dataset}
            />
        );
    } else if (component_type == "train") {
        return (
            <TrainPage
                model_name={model_name}
                parameters={parameters}
                problem_type={problem_type}
                dataset={dataset}
            />
        );
    } else if (component_type == "manual") {
        return (
            <ManualPage
                model_name={model_name}
                parameters={parameters}
                problem_type={problem_type}
                dataset={dataset}
            />
        );
    } else if (component_type == "viz_only") {
        return (
            <VizOnlyPage
                model_name={model_name}
                parameters={parameters}
                dataset={dataset}
            />
        );
    } else if (component_type == "step") {
        return (
            <StepPage
                model_name={model_name}
                parameters={parameters}
                problem_type={problem_type}
                dataset={dataset}
            />
        );
    }
};

export default ModelPage;
