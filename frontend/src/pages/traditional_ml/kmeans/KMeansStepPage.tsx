import StepPage from "@/pages/model/StepPage";
import KMeansStep from "./KMeansStepVisualisation";
import { useKMeans } from "./KMeansContext";
import type { Parameters } from "@/types/page";

export default function KMeansStepPage({ parameters }: { parameters: Parameters }) {
    return (
        <StepPage
            useModel={useKMeans}
            parameters={parameters}
            StepVisualizationComponent={KMeansStep}
        />
    );
};
