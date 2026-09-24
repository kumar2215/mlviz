/**
 * KMeans Visualization Types
 * Type definitions for KMeans clustering visualization components
 */

import type { VisualisationRenderContext } from "@/components/visualisation/types";
import * as d3 from "d3";

// ============================================================================
// Centroid Data
// ============================================================================

export interface CentroidData {
    position: number[];
    clusterId: number;
    color?: string;
}

// ============================================================================
// Iteration Data
// ============================================================================

export interface KMeansIterationVisualization {
    iteration: number;
    assignments: number[];
    centroids: number[][];
    newCentroids: number[][];
    centroidShifts: number[];
    converged: boolean;
    clusterInfo: Array<{
        cluster_id: number;
        centroid: number[];
        n_points: number;
        point_indices: number[];
    }>;
}

// ============================================================================
// Main Visualization Data
// ============================================================================

export interface KMeansVisualizationData {
    // Data points
    dataPoints: number[][];
    
    // Iterations (for playback)
    iterations: KMeansIterationVisualization[];
    totalIterations: number;
    
    // Final results
    converged: boolean;
    finalCentroids: number[][];
    finalAssignments: number[];
    
    // Decision boundary (optional)
    decisionBoundary?: {
        meshPoints: number[][];
        predictions: number[] | string[];
        dimensions: number;
    };
    
    // Metadata
    featureNames: string[];
    nDimensions: number;
    nClusters: number;
    
    // Visualization-specific
    visualisationFeatureIndices?: number[];
    visualisationFeatureNames?: string[];
    
    // Query points (for prediction mode)
    queries?: Array<{
        queryPoint: number[];
        assignment: number;
        distances: number[];
        assignedDistance: number;
    }>;
}

// ============================================================================
// Renderer Props
// ============================================================================

export interface RenderKMeansProps {
    container: d3.Selection<SVGGElement, unknown, null, undefined>;
    data: KMeansVisualizationData;
    context: VisualisationRenderContext;
    props: {
        colorScale: d3.ScaleOrdinal<string, string>;
        currentIteration?: number;
        showCentroidMovement?: boolean;
        centroidSize?: number;
        onCentroidClick?: (centroid: number[], clusterId: number) => void;
        isPlacementMode?: boolean;
        activeClusterCount?: number;
        legendPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    };
}

// ============================================================================
// Centroid Placement
// ============================================================================

export interface CentroidPlacementState {
    centroids: number[][];
    isPlacingCentroids: boolean;
    maxCentroids?: number;
}

export interface CentroidPlacementHandlers {
    onAddCentroid: (position: number[]) => void;
    onRemoveCentroid: (index: number) => void;
    onClearCentroids: () => void;
}
