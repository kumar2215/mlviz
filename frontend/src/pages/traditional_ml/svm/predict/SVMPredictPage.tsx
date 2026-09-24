import PredictPage from "@/pages/model/PredictPage";
import SVMPredictVisualization from "./SVMPredictVisualization";
import { useSVMContext } from "../SVMContext";
import type { Parameters } from "@/types/page";

export default function SVMPredictPage({ parameters } : { parameters: Parameters }) {
    return (
        <PredictPage
            useModel={useSVMContext}
            parameters={parameters}
            PredictVisualizationComponent={SVMPredictVisualization}
        />
    );
};
