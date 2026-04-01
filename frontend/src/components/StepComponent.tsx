import KMeansStep from "@/components/kmeans/clustering/step/Visualisation";
import LinearRegressionStep from "@/components/linear/regression/step/Visualisation";
import React from "react";

interface StepComponentProps {
    componentName: string;
    data?: any;
}

const componentMap: Record<string, React.ComponentType<any>> = {
    kmeans: KMeansStep,
    linear: LinearRegressionStep,
} as const;

export const StepComponent: React.FC<StepComponentProps> = ({
    componentName,
    data,
}) => {
    const Component = componentMap[componentName as keyof typeof componentMap];

    if (!Component) {
        return (
            <div className="text-center p-8">
                <p className="text-destructive">
                    Step component for "{componentName}" not found
                </p>
            </div>
        );
    }

    return <Component data={data} />;
};

export default StepComponent;
