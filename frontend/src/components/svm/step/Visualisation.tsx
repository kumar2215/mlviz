/**
 * SVM Classification – Step Visualisation
 * Manually or automatically steps through gradient updates.
 */

import { renderSVM } from "@/components/svm/SVMRenderer";
import SVMLossMapHUD from "@/components/svm/step/SVMLossMapHUD";
import SVMStepHUD, { type SVMStepMode } from "@/components/svm/step/SVMStepHUD";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useSVMContext } from "@/contexts/models/SVMContext";
import * as d3 from "d3";
import { useCallback, useEffect, useRef, useState } from "react";

const Visualisation: React.FC = () => {
    const {
        visualizationData,
        isVisualizationLoading,
        visualizationError,
        loadVisualization,
        lastVisualizationParams,
        decisionBoundary,
        stepData,
        randomizeWeights,
        performStep,
        currentW1,
        currentW2,
        currentBias,
    } = useSVMContext();

    const [mode, setMode] = useState<SVMStepMode>("idle");
    const [learningRate, setLearningRate] = useState(0.01);
    const initialised = useRef(false);

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

    useEffect(() => {
        if (visualizationData && !initialised.current) {
            initialised.current = true;
            randomizeWeights();
        }
    }, [visualizationData, randomizeWeights]);

    // After weights are set (including randomize), compute boundary for current weights
    useEffect(() => {
        if (!visualizationData) return;
        performStep({
            ...lastVisualizationParams,
            current_w1: currentW1,
            current_w2: currentW2,
            current_b: currentBias,
            learning_rate: 0,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentW1, currentW2, currentBias]);

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
        [visualizationData, mode, stepData, decisionBoundary]
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
                    <p className="text-destructive mb-2">Error loading data</p>
                    <p className="text-sm text-muted-foreground">{visualizationError}</p>
                </div>
            </div>
        );
    }

    if (!visualizationData) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center p-8">
                    Apply parameters in the sidebar to begin.
                </p>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <div className="absolute bottom-6 left-6 z-20">
                <SVMLossMapHUD />
            </div>

            <div className="absolute top-6 right-6 z-20">
                <SVMStepHUD
                    mode={mode}
                    setMode={setMode}
                    learningRate={learningRate}
                    onLearningRateChange={setLearningRate}
                />
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
