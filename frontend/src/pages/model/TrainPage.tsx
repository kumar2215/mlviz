import ModelOptionsForm from "@/components/input/ModelOptionsForm";
import useTrain from "@/hooks/useTrain";
import { SuccessAlert } from "@/components/ui/CustomAlerts";
import { useState } from "react";
import type { Parameters } from "@/types/page";

type TrainPageProps = {
    useModel: () => any;
    parameters: Parameters;
    TrainVisualizationComponent: React.FC;
    ResultsComponent: React.FC;
}

export default function TrainPage({ useModel, parameters, TrainVisualizationComponent, ResultsComponent } : TrainPageProps) {
    const [showAlert, setShowAlert] = useState(false);

    return (
        <div className="flex flex-row w-full h-full min-h-0 relative overflow-hidden bg-gray-200">
            {showAlert && (
                <SuccessAlert description="Model trained successfully." />
            )}

            <div className="shrink-0 w-40 shadow-lg overflow-auto p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-r border-gray-300">
                <ModelOptionsForm
                    {...useTrain(useModel, setShowAlert, parameters)}
                    buttonLabel="Train Model"
                />
            </div>

            <div className="flex-1 shadow-lg overflow-hidden bg-white">
                <TrainVisualizationComponent />
            </div>

            <div className="shrink-0 h-full min-h-0 p-4 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 border-l border-gray-300 overflow-auto">
                <ResultsComponent />
            </div>
        </div>
    );
};
