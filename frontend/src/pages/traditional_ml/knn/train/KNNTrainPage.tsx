import TrainPage from "@/pages/model/TrainPage";
import ClassifierResults from "@/components/results/ClassifierResults";
import KNNTrainVisualisation from "./KNNTrainVisualisation";
import { useKNN } from "../KNNContext";
import type { Parameters } from "@/types/page";

export default function KNNTrainPage({ parameters } : { parameters: Parameters }) {
    const { data } = useKNN();
    
    const resultsComponent = () => (
        <ClassifierResults
            metrics={(data as any)?.metrics}
            metadata={data?.metadata as any}
        />
    );

    return (
        <TrainPage
            useModel={useKNN}
            parameters={parameters}
            TrainVisualizationComponent={KNNTrainVisualisation}
            ResultsComponent={resultsComponent}
        />
    );
};
