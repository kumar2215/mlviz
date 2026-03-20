/**
 * Linear Regression – Training Visualisation
 * Runs OLS training and shows:
 *  - Scatter plot
 *  - Optimal OLS line (dashed green)
 *  - User-adjustable line (solid indigo) + live R²
 *  - Train / test metrics panel
 */

import { renderLinearRegression } from "@/components/linear/regression/LinearRegressionRenderer";
import LineControlHUD from "@/components/linear/regression/LineControlHUD";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useLinearRegression } from "@/contexts/models/LinearRegressionContext";
import * as d3 from "d3";
import { useCallback, useEffect, useState } from "react";

const Visualisation: React.FC = () => {
    const {
        visualizationData,
        isVisualizationLoading,
        visualizationError,
        train,
        lastVisualizationParams,
        currentSlope,
        currentIntercept,
    } = useLinearRegression();

    const [focusedLabels, setFocusedLabels] = useState<Set<string> | null>(null);

    // Auto-train on mount if we have stored params
    useEffect(() => {
        if (!visualizationData && !isVisualizationLoading) {
            train(
                Object.keys(lastVisualizationParams).length > 0
                    ? lastVisualizationParams
                    : {}
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const optimalSlope = visualizationData?.line?.slope ?? 0;
    const optimalIntercept = visualizationData?.line?.intercept ?? 0;

    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: unknown,
            context: VisualisationRenderContext
        ) => {
            if (!visualizationData) return;
            const renderResult = renderLinearRegression({
                container,
                points: visualizationData.points ?? [],
                currentSlope,
                currentIntercept,
                optimalSlope,
                optimalIntercept,
                showOptimalLine: true,
                showErrorLines: true,
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
        [visualizationData, currentSlope, currentIntercept, optimalSlope, optimalIntercept, focusedLabels]
    );

    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Training model…</p>
                </div>
            </div>
        );
    }

    if (visualizationError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">Error training model</p>
                    <p className="text-sm text-muted-foreground">{visualizationError}</p>
                </div>
            </div>
        );
    }

    if (!visualizationData) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center p-8">
                    Apply parameters in the sidebar to train the model.
                </p>
            </div>
        );
    }
    
    return (
        <div className="relative h-full w-full">
            {/* Line control HUD */}
            <div className="absolute top-6 right-6 z-20">
                <LineControlHUD />
            </div>

            {/* Legend HUD removed - now rendered inside SVG */}

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
