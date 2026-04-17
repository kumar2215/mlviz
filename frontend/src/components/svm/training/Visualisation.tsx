/**
 * SVM Classification – Training Visualisation
 * Shows optimal trained boundary and support vectors.
 * Supports animated playback of gradient descent iterations (all kernels).
 * Toggleable "kernel space" view with iterative projection animation.
 */

import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import SVMLossMapHUD from "@/components/svm/SVMLossMapHUD";
import { renderSVM } from "@/components/svm/SVMRenderer";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useSVMContext } from "@/contexts/models/SVMContext";
import * as d3 from "d3";
import { useCallback, useEffect, useState } from "react";

const Visualisation: React.FC = () => {
    const {
        visualizationData,
        isVisualizationLoading,
        visualizationError,
        train,
        lastVisualizationParams,
        iterations,
        decisionBoundary,
        currentW1,
        currentW2,
        currentBias,
        setManualWeights,
    } = useSVMContext();

    const [focusedLabels, setFocusedLabels] = useState<Set<string> | null>(null);

    useEffect(() => {
        if (!visualizationData && !isVisualizationLoading) {
            train(
                (lastVisualizationParams && Object.keys(lastVisualizationParams).length > 0)
                    ? lastVisualizationParams
                    : {}
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalIterations = iterations?.length ?? 0;

    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: unknown,
            context: VisualisationRenderContext
        ) => {
            if (!visualizationData) return;

            // 1. Determine active iteration
            const stepIndex = Math.min(
                Math.floor(context.state.currentStep ?? totalIterations - 1),
                totalIterations - 1
            );
            const currentIter = iterations[stepIndex];

            // Synchronize weights for Loss Map HUD using a non-recursive update
            if (currentIter) {
                const { w1, w2, b } = currentIter;
                // Only update if different to avoid infinite re-renders
                if (w1 !== currentW1 || w2 !== currentW2 || b !== currentBias) {
                    setManualWeights(w1, w2, b);
                }
            }

            // 2. Decide coordinates and boundary
            const activePoints = visualizationData.points ?? [];
            let activeBoundary = decisionBoundary ?? undefined;
            let activeSVIndices = currentIter?.support_vector_indices ?? visualizationData.support_vector_indices;

            // Playback override
            if (currentIter?.mesh_predictions && decisionBoundary?.meshPoints) {
                activeBoundary = { ...decisionBoundary, predictions: currentIter.mesh_predictions as any };
            }

            // 3. Coordinate Ranges
            const activeXRange = visualizationData.x_range || [-5, 5];
            const activeYRange = visualizationData.y_range || [-5, 5];

            renderSVM({
                container,
                points: activePoints,
                labels: (visualizationData.labels as number[]) ?? [],
                classNames: visualizationData.metadata?.class_names ?? ["Class 0", "Class 1"],
                supportVectorIndices: activeSVIndices,
                alphas: currentIter?.alphas,
                x_range: activeXRange,
                y_range: activeYRange,
                xLabel: visualizationData.metadata?.feature_x_name ?? "Feature 1",
                yLabel: visualizationData.metadata?.feature_y_name ?? "Feature 2",
                context,
                decisionBoundary: activeBoundary,
                w1: currentIter?.w1 ?? visualizationData.optimal_w1,
                w2: currentIter?.w2 ?? visualizationData.optimal_w2,
                bias: currentIter?.b ?? visualizationData.optimal_b,
                onLegendFilterChange: setFocusedLabels,
                focusedLabels,
                optimisedPoints: currentIter?.optimised_points,
            });
        },
        [visualizationData, iterations, decisionBoundary, totalIterations, focusedLabels]
    );

    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Training classifier…</p>
                </div>
            </div>
        );
    }

    if (visualizationError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">Error training classifier</p>
                    <p className="text-sm text-muted-foreground">{visualizationError}</p>
                </div>
            </div>
        );
    }

    if (!visualizationData) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center p-8">
                    Apply parameters in the sidebar to train the classifier.
                 </p>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <BaseVisualisation
                dataConfig={{
                    data: visualizationData,
                    renderContent: renderCallback,
                }}
                capabilities={{
                    zoomable: DEFAULT_2D_ZOOM_CONFIG,
                    playable: totalIterations > 1 ? {
                        maxSteps: totalIterations,
                        autoPlay: false,
                        stepDuration: 150,
                    } : undefined,
                }}
                controlsConfig={{
                    controlsPosition: "top-left",
                    controlsStyle: "overlay",
                }}
            />

            <div className="absolute bottom-6 right-6 z-20">
                <SVMLossMapHUD />
            </div>
        </div>
    );
};

export default Visualisation;
