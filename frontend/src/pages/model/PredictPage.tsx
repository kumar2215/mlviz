import PredictionInputForm from "@/components/input/PredictionInputForm";
import usePredict from "@/hooks/usePredict";
import { SuccessAlert } from "@/components/ui/CustomAlerts";
import { useState } from "react";
import type { Parameters } from "@/types/page";

type PredictPageProps = {
    useModel: () => any;
    parameters: Parameters;
    PredictVisualizationComponent: React.FC<{ points?: Record<string, number> | null }>;
}

export default function PredictPage({ useModel, parameters, PredictVisualizationComponent } : PredictPageProps) {
    const [showAlert, setShowAlert] = useState(false);
    const { currentFeatures, predictionInputPoints, handlePredict } = usePredict(useModel, setShowAlert, parameters);

    return (
        <div className="grid grid-cols-10 w-full h-full relative">
            {showAlert && (
                <SuccessAlert description="Prediction completed." />
            )}
            <div className="col-span-2 shadow-lg justify-between overflow-auto p-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-0">
                <PredictionInputForm
                    features={currentFeatures}
                    initialPoints={predictionInputPoints}
                    onPredict={handlePredict}
                />
            </div>
            <div className="col-span-8 shadow-lg overflow-hidden min-h-0">
                <PredictVisualizationComponent points={predictionInputPoints} />
            </div>
        </div>
    );
};
