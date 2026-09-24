import StepPage from "@/pages/model/StepPage";
import SVMStep from "./SVMStepVisualisation";
import { useSVMContext } from "../SVMContext";
import type { Parameters } from "@/types/page";

export default function SVMStepPage({ parameters } : { parameters: Parameters }) {
    return (
        <StepPage
            useModel={useSVMContext}
            parameters={parameters}
            StepVisualizationComponent={SVMStep}
        />
    );
};
