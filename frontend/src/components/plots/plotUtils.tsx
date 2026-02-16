/**
 * BasePlot - Dimension-aware abstraction layer for ML visualizations
 *
 * This component uses pure D3 render functions (following the pattern from histogramUtils).
 * It handles:
 * - Auto-detection of data dimensions (1D, 2D)
 * - Routing to appropriate D3 render function based on dimensions
 * - Standardized data transformation via VisualisationRenderContext
 * - Integration with BaseVisualisation capabilities (zoom, pan, playback)
 *
 * Use cases:
 * - KNN visualization (showing K-nearest neighbors over time)
 * - SVM decision boundaries
 * - Clustering algorithms (K-means, DBSCAN, etc.)
 * - Any ML algorithm requiring 1D-2D feature space visualization
 */

import type {
    BaseScatterPlotProps,
    Config,
    DecisionBoundary,
    SupportedDimensions,
} from "@/components/plots/types";
import {
    calculateCombinedBounds,
    createPlotPoints,
    detectDimensions,
    validateDimensions,
} from "@/components/plots/utils/dataTransformers";
import {
    renderScatter1D,
    renderScatter2D,
} from "@/components/plots/utils/scatterRenderers";
import { createZoomConfig } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import * as d3 from "d3";
import React, { useCallback, useMemo } from "react";

// ============================================================================
// BasePlot Props
// ============================================================================

export interface BasePlotProps extends Omit<
    BaseScatterPlotProps,
    "capabilities"
> {
    // Layout customization
    topControls?: React.ReactNode;
    bottomInfo?: React.ReactNode;

    // Playback configuration (for algorithm animations)
    enablePlayback?: boolean;
    maxSteps?: number;
    stepDuration?: number;
    onStepChange?: (step: number) => void;

    // Zoom configuration override
    zoomConfig?: {
        scaleExtent?: [number, number];
        enablePan?: boolean;
        panMargin?: number;
    };

    // Custom renderer override (for advanced use cases)
    customRenderer?: (props: {
        container: d3.Selection<SVGGElement, unknown, null, undefined>;
        data: number[][];
        config: Config;
        decisionBoundary?: DecisionBoundary;
        context: VisualisationRenderContext;
        plotProps: BaseScatterPlotProps;
    }) => void;
}

// ============================================================================
// BasePlot Component
// ============================================================================

const BasePlot: React.FC<BasePlotProps> = ({
    data,
    featureNames,
    config,
    decisionBoundary,
    pointRadius,
    pointOpacity,
    showGrid,
    showLegend,
    showAxes,
    onPointClick,
    onPointHover,
    topControls,
    bottomInfo,
    enablePlayback = false,
    maxSteps = 10,
    stepDuration = 1000,
    onStepChange,
    zoomConfig,
    customRenderer,
}) => {
    // ============================================================================
    // Dimension Detection
    // ============================================================================

    const dimensions = useMemo<SupportedDimensions>(() => {
        validateDimensions(data);
        return detectDimensions(data);
    }, [data]);

    // ============================================================================
    // Render Callback for BaseVisualisation
    // ============================================================================

    /**
     * Main render callback that uses D3 render functions
     * This approach follows the pattern used in DecisionTreeRenderer and histogramUtils
     */
    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            plotData: number[][],
            context: VisualisationRenderContext,
        ) => {
            // Clear previous render
            container.selectAll("*").remove();

            // If custom renderer provided, use it
            if (customRenderer) {
                customRenderer({
                    container,
                    data: plotData,
                    config,
                    decisionBoundary,
                    context,
                    plotProps: {
                        data: plotData,
                        featureNames,
                        config,
                        decisionBoundary,
                        pointRadius,
                        pointOpacity,
                        showGrid,
                        showLegend,
                        showAxes,
                        onPointClick,
                        onPointHover,
                    },
                });
                return;
            }

            // Transform data to plot points
            const plotPoints = createPlotPoints(plotData, config);
            const bounds = calculateCombinedBounds(
                plotData,
                decisionBoundary,
                0.1,
            );

            // Get dimensions from context
            const { width, height, margin, scaleFactor } = context.dimensions;

            // Render options
            const renderOptions = {
                width,
                height,
                margin,
                pointRadius,
                pointOpacity,
                showGrid,
                showLegend,
                showAxes,
                onPointClick,
                onPointHover,
                scaleFactor,
            };

            // Select appropriate render function based on dimensions
            switch (dimensions) {
                case 1:
                    renderScatter1D(
                        container,
                        plotPoints,
                        bounds,
                        featureNames,
                        config,
                        decisionBoundary,
                        renderOptions,
                    );
                    break;
                case 2:
                    renderScatter2D(
                        container,
                        plotPoints,
                        bounds,
                        featureNames,
                        config,
                        decisionBoundary,
                        renderOptions,
                    );
                    break;
                default:
                    throw new Error(`Unsupported dimensions: ${dimensions}`);
            }
        },
        [
            customRenderer,
            config,
            decisionBoundary,
            featureNames,
            pointRadius,
            pointOpacity,
            showGrid,
            showLegend,
            showAxes,
            onPointClick,
            onPointHover,
            dimensions,
        ],
    );

    // ============================================================================
    // Capabilities Configuration
    // ============================================================================

    const capabilities = useMemo(() => {
        return {
            ...(enablePlayback && {
                playable: {
                    maxSteps,
                    stepDuration,
                    showSlider: true,
                    interpolationSteps: 30,
                    autoPlay: false,
                },
            }),
            zoomable: createZoomConfig(zoomConfig),
        };
    }, [enablePlayback, maxSteps, stepDuration, zoomConfig]);

    return (
        <BaseVisualisation
            dataConfig={{
                data,
                renderContent: renderCallback,
            }}
            capabilities={capabilities}
            controlsConfig={{
                controlsPosition: "top-left",
                controlsStyle: "overlay",
            }}
            layoutConfig={{
                topControls,
                bottomInfo,
            }}
            eventHandlers={{
                onStepChange,
            }}
        />
    );
};

export default BasePlot;
