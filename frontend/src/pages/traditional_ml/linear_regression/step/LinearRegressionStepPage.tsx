import StepPage from "@/pages/model/StepPage";
import LinearRegressionStep from "./LinearRegressionStepVisualisation";
import { useLinearRegression } from "../LinearRegressionContext";
import type { Parameters } from "@/types/page";

export default function LinearRegressionStepPage({ parameters } : { parameters: Parameters }) {
    return (
        <StepPage
            useModel={useLinearRegression}
            parameters={parameters}
            StepVisualizationComponent={LinearRegressionStep}
        />
    );
};
