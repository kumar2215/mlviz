/**
 * KMeans Training Visualization
 * Interactive visualization for KMeans clustering with centroid placement and iteration playback
 */

import {
    renderKMeansTraining,
    renderSelectedCentroidMarkers,
} from "@/components/kmeans/clustering/KMeansRenderer";
import type { KMeansVisualizationData } from "@/components/kmeans/clustering/types";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import { Button } from "@/components/ui/button";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useKMeans } from "@/contexts/models/KMeansContext";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { UNASSIGNED_COLOR } from "@/utils/colorUtils";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface VisualisationProps {
    data?: unknown; // Optional data prop for compatibility with component registry
}

const Visualisation: React.FC<VisualisationProps> = () => {
    const {
        visualizationData: kmeansData,
        isVisualizationLoading,
        visualizationError,
        loadVisualization,
        lastVisualizationParams,
        train,
        selectedCentroids,
        setSelectedCentroids,
        isPlacingCentroids,
        setIsPlacingCentroids,
    } = useKMeans();
    const scaleFactor = useScaleFactor();
    const scalesRef = useRef<{
        xScale?: d3.ScaleLinear<number, number>;
        yScale?: d3.ScaleLinear<number, number>;
    }>({});

    // Reset centroid selection when switching to placement mode
    useEffect(() => {
        if (isPlacingCentroids) {
            setSelectedCentroids([]);
        }
    }, [isPlacingCentroids, setSelectedCentroids]);

    // Auto-load visualization on mount if we have stored params
    useEffect(() => {
        if (
            !kmeansData &&
            !isVisualizationLoading &&
            Object.keys(lastVisualizationParams).length > 0
        ) {
            loadVisualization(lastVisualizationParams);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Get dimensions from visualization data
    const dimensions =
        kmeansData?.visualisation_feature_indices?.length ||
        kmeansData?.data_points?.[0]?.length ||
        2;

    // Transform backend data to visualization format
    const visualizationData: KMeansVisualizationData | null = useMemo(() => {
        if (!kmeansData) return null;

        return {
            dataPoints: kmeansData.data_points || [],
            iterations: (kmeansData.iterations || []).map((iter: any) => ({
                iteration: iter.iteration,
                assignments: iter.assignments,
                centroids: iter.centroids,
                newCentroids: iter.new_centroids,
                centroidShifts: iter.centroid_shifts,
                converged: iter.converged,
                clusterInfo: iter.cluster_info,
            })),
            totalIterations: kmeansData.total_iterations || 0,
            converged: kmeansData.converged || false,
            finalCentroids: kmeansData.final_centroids || [],
            finalAssignments: kmeansData.final_assignments || [],
            decisionBoundary: kmeansData.decision_boundary
                ? {
                      meshPoints: kmeansData.decision_boundary.mesh_points,
                      predictions: kmeansData.decision_boundary
                          .predictions as unknown as number[],
                      dimensions: dimensions,
                  }
                : undefined,
            featureNames:
                kmeansData.visualisation_feature_names ||
                kmeansData.metadata?.feature_names ||
                [],
            nDimensions: dimensions,
            nClusters: kmeansData.metadata?.n_clusters || 0,
            visualisationFeatureIndices:
                kmeansData.visualisation_feature_indices,
            visualisationFeatureNames: kmeansData.visualisation_feature_names,
        };
    }, [kmeansData, dimensions]);

    // Create color scale for clusters
    const colorScale = useMemo(() => {
        if (!visualizationData) return d3.scaleOrdinal<string>();

        const nClusters =
            selectedCentroids.length || visualizationData.nClusters;
        const clusterNames =
            nClusters > 0
                ? Array.from({ length: nClusters }, (_, i) => `Cluster ${i}`)
                : [];

        // Always include "Unassigned" to match renderer and handle unassigned points
        if (!clusterNames.includes("Unassigned")) {
            clusterNames.push("Unassigned");
        }

        console.log(
            "[KMeans Visualisation] Creating clusters for color scale:",
            {
                nClusters,
                clusterNames,
                source:
                    selectedCentroids.length > 0
                        ? "selectedCentroids"
                        : "visualizationData",
            },
        );

        return d3
            .scaleOrdinal<string>()
            .domain(clusterNames)
            .range([...d3.schemeCategory10.slice(0, nClusters), UNASSIGNED_COLOR]);
    }, [visualizationData, selectedCentroids.length]);

    // Handle centroid placement click
    const handleVisualizationClick = useCallback(
        (event: MouseEvent, svg: SVGSVGElement) => {
            if (
                !isPlacingCentroids ||
                !scalesRef.current.xScale ||
                !scalesRef.current.yScale ||
                !visualizationData
            ) {
                return;
            }

            // Get click coordinates relative to the content group (not SVG root)
            const contentGroup = d3.select(svg).select(".zoom-content");

            if (contentGroup.empty()) {
                console.warn("[KMeans Visualisation] Content group not found");
                return;
            }

            // Get pointer position relative to the content group itself
            const point = d3.pointer(event, contentGroup.node() as Element);

            // The scales are already set up to map from data space to pixel space
            // within the content group, so we just need to invert them
            const clickX = scalesRef.current.xScale.invert(point[0]);
            const clickY = scalesRef.current.yScale.invert(point[1]);

            console.log("[KMeans Visualisation] Click coordinates:", {
                svgPoint: d3.pointer(event, svg),
                contentGroupPoint: point,
                dataCoordinates: [clickX, clickY],
            });

            // Find the nearest data point to the click location
            const dataPoints = visualizationData.dataPoints;
            let nearestPoint: number[] | null = null;
            let minDistance = Infinity;

            dataPoints.forEach((dataPoint) => {
                // Calculate Euclidean distance in data space
                const dx = dataPoint[0] - clickX;
                const dy = dataPoint[1] - clickY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = dataPoint;
                }
            });

            if (!nearestPoint) {
                console.warn("[KMeans Visualisation] No data points available");
                return;
            }

            // Check if this point is already selected as a centroid
            const alreadySelectedIndex = selectedCentroids.findIndex(
                (centroid) =>
                    centroid[0] === nearestPoint![0] &&
                    centroid[1] === nearestPoint![1],
            );

            if (alreadySelectedIndex !== -1) {
                // Point is already a centroid - try to remove it
                if (selectedCentroids.length > 1) {
                    console.log(
                        "[KMeans Visualisation] Removing centroid:",
                        nearestPoint,
                    );
                    setSelectedCentroids((prev) =>
                        prev.filter((_, i) => i !== alreadySelectedIndex),
                    );
                } else {
                    console.log(
                        "[KMeans Visualisation] Cannot remove last centroid:",
                        nearestPoint,
                    );
                }
                return;
            }

            // Use only the first two dimensions for 2D visualization
            const newCentroid = [nearestPoint[0], nearestPoint[1]];
            console.log(
                "[KMeans Visualisation] User selected data point as centroid:",
                {
                    clickPosition: [clickX, clickY],
                    nearestDataPoint: newCentroid,
                    distance: minDistance,
                    totalCentroids: selectedCentroids.length + 1,
                    allCentroids: [...selectedCentroids, newCentroid],
                },
            );
            setSelectedCentroids((prev) => [...prev, newCentroid]);
        },
        [isPlacingCentroids, visualizationData, selectedCentroids],
    );


    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: unknown,
            context: VisualisationRenderContext,
        ) => {
            if (!visualizationData) return;

            // Get current iteration from playback state
            const currentIteration = context.state.currentStep || 0;

            const renderResult = renderKMeansTraining({
                container,
                data: visualizationData,
                context,
                props: {
                    colorScale,
                    currentIteration,
                    showCentroidMovement: true,
                    isPlacementMode: isPlacingCentroids,
                    activeClusterCount:
                        selectedCentroids.length || visualizationData.nClusters,
                },
            });

            // Store scales for click handling
            if (renderResult?.xScale && renderResult?.yScale) {
                scalesRef.current = {
                    xScale: renderResult.xScale,
                    yScale: renderResult.yScale,
                };

                // Render selected centroids if in placement mode
                if (isPlacingCentroids && selectedCentroids.length > 0) {
                    const targetGroup = renderResult.contentGroup || container;
                    renderSelectedCentroidMarkers(
                        targetGroup,
                        selectedCentroids,
                        renderResult.xScale,
                        renderResult.yScale,
                        {
                            colorScale,
                            scaleFactor,
                            centroidSize: 4 * scaleFactor,
                        },
                    );
                }
            }

            // Attach click handler to SVG if in placement mode
            if (isPlacingCentroids && context.state.svgSelection) {
                const svg = context.state.svgSelection;
                const svgNode = svg.node();

                if (svgNode) {
                    // Remove previous click handler
                    svg.on("click.centroid", null);

                    // Add new click handler
                    svg.on("click.centroid", function (event: MouseEvent) {
                        handleVisualizationClick(event, svgNode);
                    });
                }
            } else if (context.state.svgSelection) {
                // Remove click handler when not in placement mode
                context.state.svgSelection.on("click.centroid", null);
            }
        },
        [
            visualizationData,
            colorScale,
            isPlacingCentroids,
            selectedCentroids,
            scaleFactor,
            handleVisualizationClick,
        ],
    );

    // Handle train button click
    const handleTrain = useCallback(async () => {
        if (selectedCentroids.length === 0) return;

        console.log(
            "[KMeans Visualisation] Starting training with user-placed centroids:",
            {
                nClusters: selectedCentroids.length,
                centroids: selectedCentroids,
                params: lastVisualizationParams,
            },
        );

        // Train with selected centroids (now handled automatically by context if not passed)
        await train(lastVisualizationParams);

        // Exit placement mode
        setIsPlacingCentroids(false);
    }, [selectedCentroids, train, lastVisualizationParams]);

    // Handle clear centroids
    const handleClear = useCallback(() => {
        setSelectedCentroids([]);
    }, []);

    // Handle reset to placement mode
    const handleReset = useCallback(() => {
        setIsPlacingCentroids(true);
        setSelectedCentroids([]);
    }, []);

    // Early returns AFTER all hooks
    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        Loading visualization...
                    </p>
                </div>
            </div>
        );
    }

    if (visualizationError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">
                        Error loading visualization
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {visualizationError}
                    </p>
                </div>
            </div>
        );
    }

    if (!kmeansData || !visualizationData) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-muted-foreground">
                        No visualization data available. Please configure and
                        train the model.
                    </p>
                </div>
            </div>
        );
    }

    // Calculate max steps for playback (number of iterations)
    const maxSteps = visualizationData.totalIterations;

    return (
        <div className="relative h-full">
            {/* Centroid placement controls */}
            {isPlacingCentroids && (
                <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200">
                    <div className="text-sm font-semibold mb-2">
                        Click on data points to select centroids
                    </div>
                    <div className="text-xs text-gray-600 mb-3">
                        Selected centroids: {selectedCentroids.length}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={handleTrain}
                            disabled={selectedCentroids.length === 0}
                        >
                            Train ({selectedCentroids.length} clusters)
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleClear}
                            disabled={selectedCentroids.length === 0}
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            {/* Reset button when showing results */}
            {!isPlacingCentroids && visualizationData.totalIterations > 0 && (
                <div className="absolute top-4 right-4 z-10">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReset}
                    >
                        Place New Centroids
                    </Button>
                </div>
            )}

            <BaseVisualisation
                dataConfig={{
                    data: visualizationData,
                    renderContent: renderCallback,
                }}
                capabilities={{
                    zoomable: DEFAULT_2D_ZOOM_CONFIG,
                    playable:
                        maxSteps > 0
                            ? {
                                  maxSteps: maxSteps,
                                  autoPlay: false,
                                  stepDuration: 1000,
                              }
                            : undefined,
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
