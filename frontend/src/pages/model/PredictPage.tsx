import PredictionInputForm from "@/components/input/PredictionInputForm";
import { PredictComponent } from "@/components/PredictComponent";
import { SuccessAlert } from "@/components/ui/CustomAlerts";
import { useModel } from "@/contexts/ModelContext";
import { CurrentStoryContext } from "@/contexts/StoryContext";
import type { ModelPage as ModelPageProps } from "@/types/story";
import React, { useContext, useEffect, useRef, useState } from "react";

type PredictPageProps = Pick<ModelPageProps, "model_name" | "parameters" | "dataset">;

const PredictPage: React.FC<PredictPageProps> = ({
    model_name,
    parameters,
    dataset,
}) => {
    const context = useContext(CurrentStoryContext);
    if (!context) throw new Error("No context found.");
    const { updateParams } = context;

    const {
        currentModelData,
        getFeatureNames,
        getPredictiveFeatureNames,
        predict,
        predictionResult,
        isPredicting,
    } = useModel();

    const [predictionInputPoints, setPredictionInputPoints] = useState<
        Record<string, number>
    >(parameters?.presetPoints || {});

    const currentFeatures: string[] = (typeof getPredictiveFeatureNames === 'function' 
        ? getPredictiveFeatureNames() 
        : getFeatureNames()) || [];

    useEffect(() => {
        if (currentFeatures.length > 0) {
            setPredictionInputPoints((prevPoints) => {
                const newPoints: Record<string, number> = {};
                let hasContentChanged = false;

                currentFeatures.forEach((feature) => {
                    const value = prevPoints[feature];
                    if (value !== undefined) {
                        newPoints[feature] = value;
                    }
                    if (value !== prevPoints[feature]) {
                        hasContentChanged = true;
                    }
                });

                const prevFeatures = Object.keys(prevPoints);
                const hasRemovedFeatures = prevFeatures.some(
                    (feature) => !currentFeatures.includes(feature),
                );

                if (
                    hasContentChanged ||
                    hasRemovedFeatures ||
                    Object.keys(newPoints).length !== prevFeatures.length
                ) {
                    updateParams({ predictParams: newPoints });
                    return newPoints;
                } else {
                    updateParams({ predictParams: prevPoints });
                    return prevPoints;
                }
            });
        } else {
            setPredictionInputPoints((prevPoints) => {
                if (Object.keys(prevPoints).length > 0) {
                    return {};
                }
                return prevPoints;
            });
        }
    }, [currentFeatures]);

    const lastPredictedPointsRef = useRef<string>("");

    const [showAlert, setShowAlert] = useState(false);

    const handlePredict = (newPoints: Record<string, number>) => {
        setPredictionInputPoints(newPoints);
        updateParams({ predictParams: newPoints });
        // Trigger prediction immediately on user action
        predict(newPoints);
        lastPredictedPointsRef.current = JSON.stringify(newPoints) + currentFeatures.join(",");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 2000);
    };

    // Auto-predict on mount, when features change, or when inputs change
    useEffect(() => {
        const pointsStr = JSON.stringify(predictionInputPoints) + currentFeatures.join(",");
        const hasValidPoints =
            currentFeatures.length > 0 &&
            Object.keys(predictionInputPoints).length > 0 &&
            Object.values(predictionInputPoints).every((v) => v !== undefined);

        if (hasValidPoints && currentModelData && !isPredicting && pointsStr !== lastPredictedPointsRef.current) {
            predict(predictionInputPoints);
            lastPredictedPointsRef.current = pointsStr;
        }
    }, [predictionInputPoints, predict, currentModelData, isPredicting, currentFeatures, dataset]);

    if (!currentModelData) {
        return (
            <div>
                <p>No data available to display.</p>
            </div>
        );
    }

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
                <PredictComponent
                    componentName={model_name}
                    data={currentModelData}
                    points={predictionInputPoints}
                    predictionResult={predictionResult}
                    isPredicting={isPredicting}
                />
            </div>
        </div>
    );
};

export default PredictPage;
