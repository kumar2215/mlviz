import useUserMode from "@/hooks/useUserMode";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { useEffect, useRef, useState } from "react";
import type { Parameters } from "@/types/page";
import type { ModelSelectorHook } from "@/types/modelStore";
import { useShallow } from "zustand/react/shallow";

export default function usePredict(useModel: ModelSelectorHook, setShowAlert: (show: boolean) => void, parameters: Parameters) {
    const { hook: useModeStore } = useUserMode();
    const updateParams = useModeStore(state => state.updateParams);
    const { recordPredict } = useHistoryRecorder();

    const currentModelData = useModel(state => state.currentModelData);
    const predict = useModel(state => state.predict);
    const isPredicting = useModel(state => state.isPredicting);

    const [predictionInputPoints, setPredictionInputPoints] = useState<
        Record<string, number>
    >(parameters?.presetPoints || {});

    const currentFeatures = useModel(useShallow((state): string[] =>
        (typeof state.getPredictiveFeatureNames === "function"
            ? state.getPredictiveFeatureNames()
            : state.getFeatureNames()) || [],
    ));

    useEffect(() => {
        if (currentFeatures.length > 0) {
            setPredictionInputPoints((prevPoints) => {
                const newPoints: Record<string, number> = {};
                let hasContentChanged = false;

                currentFeatures.forEach((feature: string) => {
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
    }, [currentFeatures, updateParams]);

    const lastPredictedPointsRef = useRef<string>("");

    const handlePredict = (newPoints: Record<string, number>) => {
        setPredictionInputPoints(newPoints);
        updateParams({ predictParams: newPoints });
        recordPredict(newPoints);
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
    }, [predictionInputPoints, predict, currentModelData, isPredicting, currentFeatures]);

    return {
        currentFeatures,
        predictionInputPoints,
        handlePredict
    }
}
