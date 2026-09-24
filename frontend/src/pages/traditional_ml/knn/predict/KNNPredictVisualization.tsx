/**
 * KNN Prediction Visualization
 * Displays training data, query points, and neighbor connections
 * Integrates with KNN context to make predictions and display results
 */

import { renderKNNPrediction } from "../KNNRenderer";
import type { KNNVisualizationData } from "@/types/traditional_ml/knn";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useKNN } from "@/pages/traditional_ml/knn/KNNContext";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo } from "react";

interface VisualisationProps {
    points?: Record<string, any> | null;
}

export default function KNNPredictVisualization({ points }: VisualisationProps) {
    const {
        predictionData,
        isPredictionLoading,
        predictionError,
        visualizationData,
        loadVisualization,
        isVisualizationLoading,
    } = useKNN();

    // Load visualization data if not already loaded
    useEffect(() => {
        if (!visualizationData && !predictionData && !isVisualizationLoading) {
            loadVisualization({});
        }
    }, [visualizationData, predictionData, loadVisualization, isVisualizationLoading]);

    // Use prediction data if available, otherwise fall back to visualization data
    const knnData = predictionData || visualizationData;


    // Get dimensions robustly from visualization-specific data only:
    const dimensions = 
        (knnData as any)?.visualisation_feature_indices?.length || 
        (knnData?.training_points?.[0]?.length) || 
        2;

    const visualizationData_transformed: KNNVisualizationData = useMemo(() => {
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

        // Resolve the effective feature names for visualization
        const allFeatureNames = 
             ((knnData as any).metadata?.feature_names as string[]) ||
             ((knnData as any).feature_names as string[]) ||
             [];
             
        const vizIndices = (knnData as any).visualisation_feature_indices as number[];
        const explicitVizNames = (knnData as any).visualisation_feature_names as string[];
        
        // Infer features from points if provided and no explicit visualization features are set
        const pointsFeatures = points ? Object.keys(points).filter(k => allFeatureNames.includes(k)) : [];
        const inferredVizNames = pointsFeatures.length > 0 ? pointsFeatures : [];

        const effectiveVizFeatureNames = 
            (explicitVizNames && explicitVizNames.length > 0) ? explicitVizNames :
            (vizIndices && vizIndices.length > 0 && allFeatureNames.length > 0) ? vizIndices.map(i => allFeatureNames[i]) :
            (inferredVizNames.length > 0) ? inferredVizNames :
            allFeatureNames.slice(0, dimensions);

        console.log("[KNN Visualisation] Feature debug:", {
            allFeatureNames,
            vizIndices,
            explicitVizNames,
            effectiveVizFeatureNames,
            points,
            dimensions
        });

        const featureNames = effectiveVizFeatureNames;

        const classNames =
            ((knnData as any).metadata?.class_names as string[]) ||
            ((knnData as any).class_names as string[]) ||
            [];

        // Transform prediction data to include queries
        const queries = predictionData
            ? predictionData.predictions.map((prediction, idx) => {
                  // Construct query point vector strictly from the visualized features
                  const queryPoint = effectiveVizFeatureNames.map((name: string) => {
                      const val = Number(points?.[name]);
                      console.log(`[KNN Viz] Mapping feature '${name}':`, points?.[name], "->", val);
                      return isNaN(val) ? 0 : val;
                  });

                  return {
                      queryPoint,
                      neighbors: predictionData.neighbors_info[idx].map((n) => ({
                          index: n.index,
                          distance: n.distance,
                          label: n.label,
                      })),
                      prediction: prediction,
                      predictionIndex: predictionData.prediction_indices[idx],
                      allDistances: predictionData.all_distances[idx],
                  };
              })
            : undefined;

        return {
            trainingPoints: knnData.training_points || [],
            trainingLabels: knnData.training_labels || [],
            decisionBoundary,
            featureNames,
            classNames,
            nDimensions: dimensions,
            k:
                (predictionData as any)?.neighbors_info?.[0]?.length ||
                ((knnData as any).metadata as any)?.trained_k ||
                5,
            queries,
        };
    }, [knnData, predictionData, dimensions, points]);

    // Create color scale - Use category10 to match the renderer's default
    const colorScale = useMemo(
        () =>
            d3
                .scaleOrdinal<string>()
                .domain(visualizationData_transformed.classNames)
                .range(
                    d3.schemeCategory10.slice(
                        0,
                        visualizationData_transformed.classNames.length
                    )
                ),
        [visualizationData_transformed.classNames]
    );



    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: any,
            context: VisualisationRenderContext
        ) => {
            renderKNNPrediction({
                container,
                data: visualizationData_transformed,
                context,
                props: {
                    colorScale,
                    k: visualizationData_transformed.k,
                    showNeighborLines: true,
                    showDistanceCircles: false,
                    neighborLineColor: "#666",
                    neighborLineWidth: 1.5,
                    queryPointSize: 8,
                    highlightColor: "#ff6b6b",
                },
            });
        },
        [visualizationData_transformed, colorScale]
    );

    // Move early returns AFTER all hooks
    if (isPredictionLoading || isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        {isPredictionLoading ? "Making prediction..." : "Loading visualization..."}
                    </p>
                </div>
            </div>
        );
    }

    if (predictionError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">Error making prediction</p>
                    <p className="text-sm text-muted-foreground">{predictionError}</p>
                </div>
            </div>
        );
    }

    if (!predictionData && !visualizationData) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-muted-foreground">
                        No data available. Please enter query points to make a prediction.
                    </p>
                </div>
            </div>
        );
    }

    if (!knnData) return null;

    return (
        <BaseVisualisation
            dataConfig={{
                data: visualizationData_transformed,
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
