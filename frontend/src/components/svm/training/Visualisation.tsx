/**
 * SVM Classification – Training Visualisation
 * Shows optimal trained boundary and support vectors.
 * Supports animated playback of gradient descent iterations (all kernels).
 * Toggleable "kernel space" view with iterative projection animation.
 */

import { renderSVM } from "@/components/svm/SVMRenderer";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import SVMVisualisationHUD from "@/components/svm/training/SVMVisualisationHUD";
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
    } = useSVMContext();

    const [showKernelSpace, setShowKernelSpace] = useState(false);

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

            // 2. Decide coordinates and boundary based on view toggle
            const usingKernelSpace = showKernelSpace && currentIter?.kernel_space_points != null;

            const activePoints = usingKernelSpace
                ? (currentIter?.kernel_space_points || [])
                : (visualizationData.points ?? []);

            // Original space boundary & SVs
            let activeBoundary = usingKernelSpace 
                ? (currentIter?.kernel_space_boundary || undefined) 
                : (decisionBoundary ?? undefined);
            let activeSVIndices = currentIter?.support_vector_indices ?? visualizationData.support_vector_indices;

            // Playback override for original space
            if (!usingKernelSpace && currentIter?.mesh_predictions && decisionBoundary?.meshPoints) {
                activeBoundary = { ...decisionBoundary, predictions: currentIter.mesh_predictions as any };
            }

            // 3. Coordinate Scaling
            const xs = activePoints.map((p: number[]) => p[0]);
            const ys = activePoints.map((p: number[]) => p[1]);
            const xPad = (Math.max(...xs) - Math.min(...xs)) * 0.15 || 1;
            const yPad = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
            
            const activeXRange = usingKernelSpace
                ? [Math.min(...xs) - xPad, Math.max(...xs) + xPad]
                : (visualizationData.x_range || [-5, 5]);
            const activeYRange = usingKernelSpace
                ? [Math.min(...ys) - yPad, Math.max(...ys) + yPad]
                : (visualizationData.y_range || [-5, 5]);

            renderSVM({
                container,
                points: activePoints,
                labels: (visualizationData.labels as number[]) ?? [],
                classNames: visualizationData.metadata?.class_names ?? ["Class 0", "Class 1"],
                supportVectorIndices: activeSVIndices,
                alphas: currentIter?.alphas,
                scores: currentIter?.kernel_space_points?.map((p: number[]) => p[0]),
                x_range: activeXRange,
                y_range: activeYRange,
                xLabel: usingKernelSpace ? "Decision Score f(x)" : (visualizationData.metadata?.feature_x_name ?? "Feature 1"),
                yLabel: usingKernelSpace ? "Variance Axis (PC1)" : (visualizationData.metadata?.feature_y_name ?? "Feature 2"),
                context,
                decisionBoundary: activeBoundary,
            });
        },
        [visualizationData, iterations, decisionBoundary, showKernelSpace, totalIterations]
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

    // Show toggle only if at least one iteration has kernel data
    const hasKernelData = iterations.some(it => it.kernel_space_points != null);

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

            {hasKernelData && (
                <div className="absolute top-3 right-3 z-10">
                    <SVMVisualisationHUD 
                        showKernelSpace={showKernelSpace}
                        setShowKernelSpace={setShowKernelSpace}
                    />
                </div>
            )}
        </div>
    );
};

export default Visualisation;
