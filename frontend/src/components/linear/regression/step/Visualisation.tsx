/**
 * Linear Regression – Gradient Descent Step Visualisation
 * Starts from a horizontal line (slope=0, intercept=mean(y)).
 * User can: manually adjust the line via LineControlHUD,
 * then step through gradient descent with GDStepHUD (Accept / Reject each update).
 */

import { renderLinearRegression } from "@/components/linear/regression/LinearRegressionRenderer";
import LineControlHUD from "@/components/linear/regression/LineControlHUD";
import LossMapHUD from "@/components/linear/regression/LossMapHUD";
import GDStepHUD, {
    type GDStepMode,
} from "@/components/linear/regression/step/GDStepHUD";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useLinearRegression } from "@/contexts/models/LinearRegressionContext";
import * as d3 from "d3";
import { useCallback, useEffect, useRef, useState } from "react";

const Visualisation: React.FC = () => {
    const {
        visualizationData,
        isVisualizationLoading,
        visualizationError,
        loadVisualization,
        lastVisualizationParams,
        currentSlope,
        currentIntercept,
        stepData,
        randomizeLine,
    } = useLinearRegression();

    const [focusedLabels, setFocusedLabels] = useState<Set<string> | null>(
        null,
    );

    const [mode, setMode] = useState<GDStepMode>("idle");
    const [learningRate, setLearningRate] = useState(0.01);
    const initialised = useRef(false);

    // Auto-load scatter data, then initialise line to horizontal (slope=0, mean(y))
    useEffect(() => {
        if (!visualizationData && !isVisualizationLoading) {
            loadVisualization(
                Object.keys(lastVisualizationParams).length > 0
                    ? lastVisualizationParams
                    : {},
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Once data arrives for the first time, randomize the line
    useEffect(() => {
        if (visualizationData && !initialised.current) {
            initialised.current = true;
            randomizeLine();
        }
    }, [visualizationData, randomizeLine]);

    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: unknown,
            context: VisualisationRenderContext,
        ) => {
            if (!visualizationData) return;

            const showProposed = mode === "preview" && !!stepData;
            const renderResult = renderLinearRegression({
                container,
                points: visualizationData.points ?? [],
                currentSlope,
                currentIntercept,
                proposedSlope: showProposed ? stepData!.new_slope : undefined,
                proposedIntercept: showProposed
                    ? stepData!.new_intercept
                    : undefined,
                xRange: visualizationData.x_range as [number, number],
                yRange: visualizationData.y_range as [number, number],
                xLabel: visualizationData.metadata?.feature_x_name ?? "x",
                yLabel: visualizationData.metadata?.target_name ?? "y",
                context,
                focusedLabels,
            });

            if (renderResult.legend) {
                renderResult.legend.onFilterChange(setFocusedLabels);
            }
        },
        [
            visualizationData,
            currentSlope,
            currentIntercept,
            mode,
            stepData,
            focusedLabels,
        ],
    );

    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading…</p>
                </div>
            </div>
        );
    }

    if (visualizationError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">Error loading data</p>
                    <p className="text-sm text-muted-foreground">
                        {visualizationError}
                    </p>
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
            <div className="absolute top-18 left-4 z-20">
                <LineControlHUD />
            </div>

            {/* Loss map — bottom right */}
            <div className="absolute bottom-6 right-6 z-20">
                <LossMapHUD />
            </div>

            {/* GD step control — right side */}
            <div className="absolute top-6 right-6 z-20">
                <GDStepHUD
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
