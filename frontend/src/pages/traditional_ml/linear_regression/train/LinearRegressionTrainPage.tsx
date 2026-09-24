import TrainPage from "@/pages/model/TrainPage";
import RegressionResults from "@/components/results/RegressionResults";
import LinearRegressionTrain from "./LinearRegressionTrainVisualisation";
import { useLinearRegression } from "../LinearRegressionContext";
import type { Parameters } from "@/types/page";
import type { RegressionMetadata } from "@/types/model";

export default function LinearRegressionTrainPage({ parameters } : { parameters: Parameters }) {
    const { data } = useLinearRegression();
    
    const resultsComponent = () => (
        <RegressionResults
            metrics={(data as any)?.metrics}
            metadata={data?.metadata as RegressionMetadata}
        />
    );

    return (
        <TrainPage
            useModel={useLinearRegression}
            parameters={parameters}
            TrainVisualizationComponent={LinearRegressionTrain}
            ResultsComponent={resultsComponent}
        />
    );
};
