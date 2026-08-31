import { TrainComponent } from "@/components/TrainComponent";
import { useModel } from "@/contexts/ModelContext";
import { useCurrentStory } from "@/store/useAppStore";
import { useEffect } from "react";

type VizOnlyPageProps = Pick<ModelPageProps, "model_name" | "parameters" | "dataset">;

const VizOnlyPage: React.FC<VizOnlyPageProps> = ({
    model_name,
    parameters,
    dataset,
}) => {
    const model = useModel();
    
    // Support both unified properties and KNN-specific properties
    const visualizationData = (model as any).visualizationData || (model as any).data;
    const loadVisualization = (model as any).loadVisualization || (model as any).train;

    // We still call useCurrentStory to ensure this page is used within a story context,
    // even if we don't use its return values directly in this component.
    useCurrentStory();

    useEffect(() => {
        if (loadVisualization) {
            const loadParams = {
                ...(parameters || {}),
                dataset: (parameters as any)?.dataset || dataset,
            };
            loadVisualization(loadParams);
        }
    }, [parameters, dataset, loadVisualization]);

    return (
        <div className="mx-auto w-full h-full">
            <TrainComponent
                data={visualizationData}
                componentName={model_name}
            />
        </div>
    );
};

export default VizOnlyPage;
