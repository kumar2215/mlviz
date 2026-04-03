/**
 * SVM Classification – Step Visualisation
 * Manual exploration of the decision boundary and margins.
 * Includes subgradient descent step-by-step HUD.
 */

import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import { renderSVM } from "@/components/svm/SVMRenderer";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useSVMContext } from "@/contexts/models/SVMContext";
import { useCallback, useEffect, useState } from "react";
import SVMStepHUD, { type SVMStepMode } from "./SVMStepHUD";
import SVMLossMapHUD from "@/components/svm/SVMLossMapHUD";

const Visualisation: React.FC = () => {
    const {
        visualizationData,
        isVisualizationLoading,
        visualizationError,
        loadVisualization,
        lastVisualizationParams,
        currentW1,
        currentW2,
        currentBias,
        stepData,
        decisionBoundary,
    } = useSVMContext();

    const [mode, setMode] = useState<SVMStepMode>("idle");
    const [learningRate, setLearningRate] = useState(0.01);

    // Auto-reload on mount
    useEffect(() => {
        if (!visualizationData && !isVisualizationLoading) {
            loadVisualization(
                Object.keys(lastVisualizationParams).length > 0
                    ? lastVisualizationParams
                    : {}
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: unknown,
            context: VisualisationRenderContext
        ) => {
            if (!visualizationData) return;

            const showProposed = mode === "preview" && !!stepData;
            
            // Only show support vectors when we have run a step
            const currentSupportVectors = showProposed && stepData 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (stepData as any).support_vector_indices 
                : undefined;

            const points = visualizationData.points ?? [];
            const labels = visualizationData.labels ?? [];

            // Compute dynamic decision boundary regions for the current weights
            let dynamicBoundary = undefined;
            if (decisionBoundary?.meshPoints) {
                const classNames = visualizationData.metadata?.class_names ?? ["Class 0", "Class 1"];
                const dynamicPredictions = decisionBoundary.meshPoints.map((point: number[] | [number, number]) => {
                    const score = currentW1 * point[0] + currentW2 * point[1] + currentBias;
                    return classNames[score > 0 ? 1 : 0];
                });
                dynamicBoundary = {
                    type: "classification" as "classification",
                    meshPoints: decisionBoundary.meshPoints,
                    predictions: dynamicPredictions,
                    dimensions: decisionBoundary.dimensions
                };
            }

            // Execute single render
            renderSVM({
                container,
                points,
                labels,
                classNames: visualizationData.metadata?.class_names ?? ["Class 0", "Class 1"],
                x_range: visualizationData.x_range || [-5, 5],
                y_range: visualizationData.y_range || [-5, 5],
                xLabel: visualizationData.metadata?.feature_x_name ?? "Feature 1",
                yLabel: visualizationData.metadata?.feature_y_name ?? "Feature 2",
                context,
                decisionBoundary: dynamicBoundary,
                w1: currentW1,
                w2: currentW2,
                bias: currentBias,
                supportVectorIndices: currentSupportVectors,
                proposedW1: showProposed ? stepData!.new_w1 : undefined,
                proposedW2: showProposed ? stepData!.new_w2 : undefined,
                proposedBias: showProposed ? stepData!.new_b : undefined,
            });
        },
        [visualizationData, decisionBoundary, currentW1, currentW2, currentBias, mode, stepData]
    );

    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading classification space…</p>
                </div>
            </div>
        );
    }

    if (visualizationError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">Error loading visualisation</p>
                    <p className="text-sm text-muted-foreground">{visualizationError}</p>
                </div>
            </div>
        );
    }

    if (!visualizationData) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-muted-foreground">
                        Apply parameters in the sidebar to begin.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            {/* SVM step control — right side */}
            <div className="absolute top-6 left-6 z-20">
                <SVMStepHUD 
                    mode={mode} 
                    setMode={setMode} 
                    learningRate={learningRate} 
                    onLearningRateChange={setLearningRate} 
                />
            </div>
            
            {/* Loss map — bottom right */}
            <div className="absolute bottom-6 right-6 z-20">
                <SVMLossMapHUD />
            </div>

            <BaseVisualisation
                dataConfig={{
                    data: visualizationData,
                    renderContent: renderCallback,
                }}
                capabilities={{
                    zoomable: DEFAULT_2D_ZOOM_CONFIG,
                }}
                controlsConfig={{
                    controlsPosition: "top-left",
                    controlsStyle: "overlay",
                }}
            />
        </div>
    );
};

export default Visualisation;
