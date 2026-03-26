import DecisionTree from "@/components/decision_tree/classifier/training/Visualisation";
import KMeans from "@/components/kmeans/clustering/training/Visualisation";
import KNN from "@/components/knn/classifier/training/Visualisation";
import LinearRegressionTrain from "@/components/linear/regression/training/Visualisation";
import SVMTrain from "@/components/svm/training/Visualisation";

import type { TrainModelResponse } from "@/types/model";
import React from "react";
interface ComponentRegistryProps {
    componentName: string;
    data?: TrainModelResponse | Record<string, any> | null;
}

const componentMap: Record<string, React.ComponentType<any>> = {
    decision_tree: DecisionTree,
    knn: KNN,
    kmeans: KMeans,
    linear: LinearRegressionTrain,
    svm: SVMTrain,
} as const;

export const TrainComponent: React.FC<ComponentRegistryProps> = ({
    componentName,
    data,
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

    return <Component data={data} />;
};
