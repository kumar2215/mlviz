/**
 * Linear Regression – Visualise (scatter only)
 * Shows scatter plot with a user-controllable line and live R².
 * No fitting — the user drags sliders to explore the relationship.
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
        loadVisualization,
        lastVisualizationParams,
        currentSlope,
        currentIntercept,
    } = useLinearRegression();

    const [focusedLabels, setFocusedLabels] = useState<Set<string> | null>(null);

    // Auto-reload on mount if params are stored
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
            const renderResult = renderLinearRegression({
                container,
                points: visualizationData.points ?? [],
                currentSlope,
                currentIntercept,
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
        [visualizationData, currentSlope, currentIntercept, focusedLabels]
    );

    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading visualisation…</p>
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
            <div className="absolute top-6 right-6 z-20">
                <LineControlHUD />
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
