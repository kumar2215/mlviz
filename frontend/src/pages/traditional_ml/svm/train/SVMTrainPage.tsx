import TrainPage from "@/pages/model/TrainPage";
import ClassifierResults from "@/components/results/ClassifierResults";
import SVMTrainVisualisation from "@/pages/traditional_ml/svm/train/SVMTrainVisualisation";
import { useSVMContext } from "../SVMContext";
import type { Parameters } from "@/types/page";

export default function SVMTrainPage({ parameters } : { parameters: Parameters }) {
    const { data } = useSVMContext();
    
    const resultsComponent = () => (
        <ClassifierResults
            metrics={(data as any)?.metrics}
            metadata={data?.metadata as any}
        />
    );

    return (
        <TrainPage
            useModel={useSVMContext}
            parameters={parameters}
            TrainVisualizationComponent={SVMTrainVisualisation}
            ResultsComponent={resultsComponent}
        />
    );
};
