import useUserMode from "@/hooks/useUserMode";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Parameters } from "@/types/page";

export default function usePredict(useModel: () => any, setShowAlert: (show: boolean) => void, parameters: Parameters) {
    const hook = useUserMode().hook;
    const { updateParams } = hook();
    const { recordPredict } = useHistoryRecorder();

    const {
        currentModelData,
        getFeatureNames,
        getPredictiveFeatureNames,
        predict,
        isPredicting,
    } = useModel();

    const [predictionInputPoints, setPredictionInputPoints] = useState<
        Record<string, number>
    >(parameters?.presetPoints || {});

    const rawFeatures = (typeof getPredictiveFeatureNames === 'function'
        ? getPredictiveFeatureNames()
        : getFeatureNames()) || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const currentFeatures = useMemo(() => rawFeatures, [JSON.stringify(rawFeatures)]);

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
