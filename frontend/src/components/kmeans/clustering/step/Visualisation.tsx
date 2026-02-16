/**
 * KMeans Step-by-Step Training Visualization
 * Specialized for an iterative cycle: Select -> Run Step -> Preview Next -> Repeat
 */

import {
    renderKMeansTraining,
    renderProposedCentroidMarkers,
    renderSelectedCentroidMarkers,
} from "@/components/kmeans/clustering/KMeansRenderer";
import type { KMeansVisualizationData } from "@/components/kmeans/clustering/types";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useKMeans } from "@/contexts/models/KMeansContext";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { UNASSIGNED_COLOR } from "@/utils/colorUtils";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import KMeansStepHUD, { type KMeansStepMode } from "./KMeansStepHUD";

interface VisualisationProps {
    data?: unknown;
}

const Visualisation: React.FC<VisualisationProps> = () => {
    const {
        visualizationData: kmeansData,
        loadVisualization,
        lastVisualizationParams,
        stepData,
        selectedCentroids,
        setSelectedCentroids,
        setIsPlacingCentroids,
    } = useKMeans();

    const scaleFactor = useScaleFactor();
    const [mode, setMode] = useState<KMeansStepMode>("ready");
    const scalesRef = useRef<{
        xScale?: d3.ScaleLinear<number, number>;
        yScale?: d3.ScaleLinear<number, number>;
    }>({});

    // Sync placement mode with context
    useEffect(() => {
        setIsPlacingCentroids(mode === "selecting");
    }, [mode, setIsPlacingCentroids]);

    // Reset mode when data is cleared or centroids are emptied
    useEffect(() => {
        if (!kmeansData) {
            setMode("ready");
        } else if (mode === "ready" && selectedCentroids.length > 0) {
            setMode("selecting");
        }
    }, [kmeansData, selectedCentroids.length]);

    // Dimensions helper
    const dimensions = kmeansData?.visualisation_feature_indices?.length || 2;

    // Transform and inject selected/preview centroids into visualization data
    const modifiedVisualizationData: KMeansVisualizationData | null =
        useMemo(() => {
            if (!kmeansData) return null;

            const currentPoints = kmeansData.data_points || [];

            // We inject a fake "iteration" that represents the CURRENT interactive state
            // This allows the renderer to show assignments/boundaries based on what the user is doing
            const interactiveCentroids =
                mode === "preview" && stepData?.new_centroids
                    ? stepData.new_centroids
                    : selectedCentroids;

            // Prefer boundary data from stepData if available (more recent), fallback to initial load data
            const boundarySource =
                stepData?.decision_boundary || kmeansData.decision_boundary;

            const baseData: KMeansVisualizationData = {
                dataPoints: currentPoints,
                iterations: [
                    {
                        iteration: 0,
                        assignments: currentPoints.map(() => -1),
                        centroids: interactiveCentroids,
                        newCentroids: stepData?.new_centroids || [],
                        centroidShifts: [],
                        converged: false,
                        clusterInfo: [],
                    },
                ],
                totalIterations: 1,
                converged: false,
                finalCentroids: interactiveCentroids,
                finalAssignments: currentPoints.map(() => -1),
                decisionBoundary: boundarySource
                    ? {
                          meshPoints: boundarySource.mesh_points,
                          predictions: boundarySource.predictions as string[],
                          dimensions: dimensions,
                      }
                    : undefined,
                featureNames: kmeansData.visualisation_feature_names || [],
                nDimensions: dimensions,
                nClusters: interactiveCentroids.length,
            };

            return baseData;
        }, [kmeansData, selectedCentroids, stepData, mode, dimensions]);

    const colorScale = useMemo(() => {
        const n = Math.max(selectedCentroids.length, 1);
        const domain = [
            ...Array.from({ length: n }, (_, i) => `Cluster ${i}`),
            "Unassigned",
        ];
        return d3
            .scaleOrdinal<string>()
            .domain(domain)
            .range([...d3.schemeCategory10.slice(0, n), UNASSIGNED_COLOR]);
    }, [selectedCentroids.length]);

    const handlePointClick = useCallback(
        (event: MouseEvent, svg: SVGSVGElement) => {
            if (
                mode !== "selecting" ||
                !scalesRef.current.xScale ||
                !scalesRef.current.yScale ||
                !kmeansData
            )
                return;

            const targetGroup = d3.select(svg).select(".zoom-content");
            if (targetGroup.empty()) return;

            const [mx, my] = d3.pointer(event, targetGroup.node());
            const x = scalesRef.current.xScale.invert(mx);
            const y = scalesRef.current.yScale
                ? scalesRef.current.yScale.invert(my)
                : 0;

            // Snap to nearest data point
            let nearestPoint = null;
            let minDist = Infinity;
            for (const p of kmeansData.data_points) {
                const d = Math.sqrt((p[0] - x) ** 2 + (p[1] - y) ** 2);
                if (d < minDist) {
                    minDist = d;
                    nearestPoint = p;
                }
            }

            if (nearestPoint && minDist < 0.5) {
                // Snapping threshold
                setSelectedCentroids((prev) => {
                    const isSelected = prev.some(
                        (c) =>
                            c[0] === nearestPoint![0] &&
                            c[1] === nearestPoint![1],
                    );
                    if (isSelected) {
                        return prev.filter(
                            (c) =>
                                !(
                                    c[0] === nearestPoint![0] &&
                                    c[1] === nearestPoint![1]
                                ),
                        );
                    }
                    return [...prev, nearestPoint!];
                });
            }
        },
        [mode, kmeansData, setSelectedCentroids],
    );

    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: any,
            context: VisualisationRenderContext,
        ) => {
            if (!modifiedVisualizationData) return;

            const result = renderKMeansTraining({
                container,
                data: modifiedVisualizationData,
                context,
                props: {
                    colorScale,
                    isPlacementMode: mode === "selecting" || mode === "preview",
                    activeClusterCount: selectedCentroids.length,
                    legendPosition: "bottom-right",
                },
            });

            if (result?.xScale && result?.yScale) {
                scalesRef.current = {
                    xScale: result.xScale,
                    yScale: result.yScale,
                };
                const targetGroup = result.contentGroup || container;
                const { innerWidth, innerHeight } = result.bounds || {
                    innerWidth:
                        context.dimensions.width -
                        context.dimensions.margin.left -
                        context.dimensions.margin.right,
                    innerHeight:
                        context.dimensions.height -
                        context.dimensions.margin.top -
                        context.dimensions.margin.bottom,
                };

                // 1. Add/Update a transparent background for reliable clicking
                targetGroup
                    .selectAll(".click-surface")
                    .data([null])
                    .join("rect")
                    .attr("class", "click-surface")
                    .attr("width", innerWidth)
                    .attr("height", innerHeight)
                    .attr("fill", "transparent")
                    .style(
                        "cursor",
                        mode === "selecting" ? "crosshair" : "default",
                    )
                    .on("click", (e) =>
                        handlePointClick(
                            e,
                            context.state.svgSelection!.node()!,
                        ),
                    );

                // Remove previous markers and render fresh
                targetGroup.selectAll(".selected-centroids").remove();
                targetGroup.selectAll(".proposed-centroids").remove();

                const markerOptions = {
                    colorScale,
                    scaleFactor,
                    centroidSize: 4 * scaleFactor,
                };

                // Render selected centroid markers
                if (selectedCentroids.length > 0) {
                    renderSelectedCentroidMarkers(
                        targetGroup,
                        selectedCentroids,
                        result.xScale,
                        result.yScale,
                        markerOptions,
                    );
                }

                // Render proposed centroid markers in preview mode
                if (mode === "preview" && stepData?.new_centroids) {
                    renderProposedCentroidMarkers(
                        targetGroup,
                        stepData.new_centroids,
                        result.xScale,
                        result.yScale,
                        markerOptions,
                    );
                }
            }
        },
        [
            modifiedVisualizationData,
            colorScale,
            mode,
            selectedCentroids,
            stepData,
            scaleFactor,
            handlePointClick,
        ],
    );

    const handleInitialLoad = useCallback(() => {
        if (
            !kmeansData &&
            lastVisualizationParams &&
            Object.keys(lastVisualizationParams).length > 0
        ) {
            // Check if boundary should be included based on params
            const includeBoundary =
                lastVisualizationParams?.include_boundary !== false;

            loadVisualization({
                ...lastVisualizationParams,
                include_boundary: includeBoundary,
            });
        }
    }, [kmeansData, lastVisualizationParams, loadVisualization]);

    useEffect(() => {
        handleInitialLoad();
    }, [handleInitialLoad]);

    if (!kmeansData)
        return <div className="p-8 text-center">Initializing...</div>;

    return (
        <div className="relative h-full w-full">
            {/* Control HUD */}
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-4">
                <KMeansStepHUD
                    mode={mode}
                    setMode={setMode}
                />
            </div>

            <BaseVisualisation
                dataConfig={{
                    data: modifiedVisualizationData,
                    renderContent: renderCallback,
                }}
                capabilities={{
                    zoomable: {
                        ...DEFAULT_2D_ZOOM_CONFIG,
                        enablePan: mode !== "selecting",
                        clickableSelector: ".zoom-content, .zoom-content *",
                    },
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
