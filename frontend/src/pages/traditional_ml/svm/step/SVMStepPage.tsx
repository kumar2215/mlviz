import StepPage from "@/pages/model/StepPage";
import SVMStep from "./SVMStepVisualisation";
import { useSVM } from "@/store/traditional_ml/useSVM";
import type { Parameters } from "@/types/page";

export default function SVMStepPage({ parameters } : { parameters: Parameters }) {
    return (
        <StepPage
            useModel={useSVM}
            parameters={parameters}
            StepVisualizationComponent={SVMStep}
        />
    );
};
