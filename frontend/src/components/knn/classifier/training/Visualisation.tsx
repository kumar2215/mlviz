/**
 * KNN Training Visualization
 * Displays the training dataset with decision boundaries
 * Integrates with KNN context to load and display visualization data
 */

import { renderKNNTraining } from "@/components/knn/classifier/KNNRenderer";
import type { KNNVisualizationData } from "@/components/knn/classifier/types";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useKNN } from "@/contexts/models/KNNContext";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo } from "react";

interface VisualisationProps {
    data?: any; // Optional data prop for compatibility with component registry
}

const Visualisation: React.FC<VisualisationProps> = () => {
    const {
        visualizationData: knnData,
        isVisualizationLoading,
        visualizationError,
        loadVisualization,
        lastVisualizationParams,
    } = useKNN();

    // Auto-load visualization on mount if we have stored params
    useEffect(() => {
        if (!knnData && !isVisualizationLoading && Object.keys(lastVisualizationParams).length > 0) {
            loadVisualization(lastVisualizationParams);
        }
    }, []); // Only run on mount

    // Get dimensions robustly from visualization-specific data only:
    const dimensions = 
        knnData?.visualisation_feature_indices?.length || 
        (knnData?.training_points?.[0]?.length) || 
        2; // Default to 2 if no data yet

    const visualizationData: KNNVisualizationData = useMemo(() => {
        if (!knnData) {
            return {
                trainingPoints: [],
                trainingLabels: [],
                decisionBoundary: undefined,
                featureNames: [],
                classNames: [],
                nDimensions: 0,
                k: 5,
                queries: undefined,
            };
        }

        const decisionBoundary = knnData.decision_boundary
            ? {
                  meshPoints: knnData.decision_boundary.mesh_points,
                  predictions: knnData.decision_boundary.predictions,
                  dimensions: dimensions,
              }
            : undefined;

        const result = {
            trainingPoints: knnData.training_points || [],
            trainingLabels: knnData.training_labels || [],
            decisionBoundary,
            featureNames:
                ((knnData as any).visualisation_feature_names as string[]) ||
                (knnData.metadata?.feature_names as string[]) ||
                ((knnData as any).feature_names as string[]) ||
                [],
            classNames:
                (knnData.metadata?.class_names as string[]) ||
                ((knnData as any).class_names as string[]) ||
                [],
            nDimensions: dimensions,
            k: (lastVisualizationParams.parameters as any)?.n_neighbors || 5,
            queries: undefined,
        };

        return result;
    }, [knnData, dimensions, lastVisualizationParams.parameters]);

    // Create color scale - Use category10 to match renderer
    const colorScale = useMemo(
        () =>
            d3
                .scaleOrdinal<string>()
                .domain(visualizationData.classNames)
                .range(
                    d3.schemeCategory10.slice(
                        0,
                        visualizationData.classNames.length
                    )
                ),
        [visualizationData.classNames]
    );



    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: any,
            context: VisualisationRenderContext
        ) => {
            renderKNNTraining({
                container,
                data: visualizationData,
                context,
                props: {
                    colorScale,
                    k: visualizationData.k,
                },
            });
        },
        [visualizationData, colorScale]
    );

    // Early returns AFTER all hooks
    // Show loading state
    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading visualization...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (visualizationError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">Error loading visualization</p>
                    <p className="text-sm text-muted-foreground">{visualizationError}</p>
                </div>
            </div>
        );
    }

    // Show empty state
    if (!knnData) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-muted-foreground">
                        No visualization data available. Please configure and load a dataset.
                    </p>
                </div>
            </div>
        );
    }

    return (
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
    );
};

export default Visualisation;
