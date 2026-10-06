import PredictPage from "@/pages/model/PredictPage";
import SVMPredictVisualization from "./SVMPredictVisualization";
import { useSVM } from "@/store/traditional_ml/useSVM";
import type { Parameters } from "@/types/page";

export default function SVMPredictPage({ parameters } : { parameters: Parameters }) {
    return (
        <PredictPage
            useModel={useSVM}
            parameters={parameters}
            PredictVisualizationComponent={SVMPredictVisualization}
        />
    );
};
