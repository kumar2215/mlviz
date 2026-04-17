import DecisionTreePredictVisualization from "@/components/decision_tree/classifier/prediction/Visualisation";
import KMeansPredictVisualisation from "@/components/kmeans/clustering/prediction/Visualisation";
import KNNPredictVisualization from "@/components/knn/classifier/prediction/Visualisation";
import LinearRegressionVizVisualisation from "@/components/linear/regression/prediction/Visualisation";
import SVMPredictVisualization from "@/components/svm/prediction/Visualisation";
import type { PredictionResult } from "@/contexts/models/BaseModelContext";
import React from "react";

interface ComponentRegistryProps {
    componentName: string;
    data?: Record<string, any> | null;
    points?: Record<string, any> | null;
    predictionResult?: PredictionResult<any> | null;
    isPredicting?: boolean;
}

const componentMap: Record<string, React.ComponentType<any>> = {
    decision_tree: DecisionTreePredictVisualization,
    knn: KNNPredictVisualization,
    kmeans: KMeansPredictVisualisation,
    linear: LinearRegressionVizVisualisation,
    svm: SVMPredictVisualization,
} as const;

export const PredictComponent: React.FC<ComponentRegistryProps> = ({
    componentName,
    data,
    points,
    predictionResult,
    isPredicting,
}) => {
    const Component = componentMap[componentName as keyof typeof componentMap];
    if (!Component) {
        return (
            <div className="text-center p-8">
                <p className="text-destructive">
                    Component "{componentName}" not found
                </p>
            </div>
        );
    }

    return (
        <Component
            data={data}
            points={points}
            predictionResult={predictionResult}
            isPredicting={isPredicting}
        />
    );
};
