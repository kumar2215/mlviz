import PredictPage from "@/pages/model/PredictPage";
import KNNPredictVisualization from "./KNNPredictVisualization";
import { useKNN } from "../KNNContext";
import type { Parameters } from "@/types/page";

export default function KNNPredictPage({ parameters } : { parameters: Parameters }) {
    return (
        <PredictPage
            useModel={useKNN}
            parameters={parameters}
            PredictVisualizationComponent={KNNPredictVisualization}
        />
    );
};
