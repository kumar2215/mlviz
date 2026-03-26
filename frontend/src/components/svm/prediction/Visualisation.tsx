/**
 * SVM Classification – Prediction Visualisation
 * Manual exploration of the decision boundary and margins.
 */

import { renderSVM } from "@/components/svm/SVMRenderer";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useSVMContext } from "@/contexts/models/SVMContext";
import { useCallback, useEffect } from "react";

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
        decisionBoundary,
        makePrediction,
        predictionData
    } = useSVMContext();

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

    // Request new prediction metrics when weights change
    useEffect(() => {
        if (visualizationData) {
            makePrediction({
                ...lastVisualizationParams,
                w1: currentW1,
                w2: currentW2,
                b: currentBias
            });
        }
    }, [currentW1, currentW2, currentBias, visualizationData, lastVisualizationParams, makePrediction]);

    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: unknown,
            context: VisualisationRenderContext
        ) => {
            if (!visualizationData) return;
            renderSVM({
                container,
                points: visualizationData.points ?? [],
                labels: visualizationData.labels ?? [],
                classNames: visualizationData.metadata?.class_names ?? ["Class 0", "Class 1"],
                x_range: visualizationData.x_range || [-5, 5],
                y_range: visualizationData.y_range || [-5, 5],
                xLabel: visualizationData.metadata?.feature_x_name ?? "Feature 1",
                yLabel: visualizationData.metadata?.feature_y_name ?? "Feature 2",
                context,
                decisionBoundary: decisionBoundary ?? undefined,
            });
        },
        [visualizationData, decisionBoundary]
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
                        Apply parameters in the sidebar to begin mapping the decision boundary.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            {/* Displaying Live Loss Info in absolute position */}
            {predictionData && (
                <div className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Validation</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-slate-600">Hinge Loss:</span>
                        <span className="font-mono text-indigo-600 text-right">{predictionData.loss?.toFixed(4)}</span>
                        <span className="text-slate-600">Accuracy:</span>
                        <span className="font-mono text-emerald-600 text-right">
                            {predictionData.metrics?.train?.accuracy !== undefined 
                                ? (predictionData.metrics.train.accuracy * 100).toFixed(1) + "%" 
                                : "--"}
                        </span>
                    </div>
                </div>
            )}

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
