/**
 * KNN Visualization Types
 * Types and interfaces for K-Nearest Neighbors visualization components
 */

import type { VisualisationRenderContext } from "@/components/visualisation/types";
import type * as d3 from "d3";

// ============================================================================
// Data Types
// ============================================================================

/**
 * Information about a single neighbor
 */
export interface NeighborInfo {
    index: number; // Index in training data
    distance: number; // Distance from query point
    label: string; // Class label
}

/**
 * Complete KNN visualization data for a single query point
 */
export interface KNNQueryVisualization {
    queryPoint: number[]; // Query point coordinates
    neighbors: NeighborInfo[]; // K-nearest neighbors
    prediction: string; // Predicted class
    predictionIndex: number; // Predicted class index
    allDistances: number[]; // Distances to all training points
}

/**
 * Complete KNN dataset for visualization
 */
export interface KNNVisualizationData {
    // Training data
    trainingPoints: number[][];
    trainingLabels: string[];

    // Query points and their neighbors (for prediction mode)
    queries?: KNNQueryVisualization[];

    // Decision boundary
    decisionBoundary?: {
        meshPoints: number[][];
        predictions: string[];
        dimensions: number;
    };

    // Metadata
    featureNames: string[];
    classNames: string[];
    nDimensions: number;
    k: number; // Number of neighbors
}

// ============================================================================
// Render Props
// ============================================================================

/**
 * Props passed to the KNN render function
 */
export interface KNNRenderProps {
    colorScale: d3.ScaleOrdinal<string, string>;
    k: number; // Number of neighbors to highlight
    showNeighborLines?: boolean; // Show lines to neighbors
    showDistanceCircles?: boolean; // Show distance circles
    neighborLineColor?: string;
    neighborLineWidth?: number;
    queryPointSize?: number;
    highlightColor?: string;
    onPointClick?: (index: number, point: number[]) => void; // Click handler for interactive mode
    rotation3D?: { alpha: number; beta: number }; // 3D rotation angles
}

/**
 * Complete props for the KNN render function
 */
export interface RenderKNNVisualisationProps {
    container: d3.Selection<SVGGElement, unknown, null, undefined>;
    data: KNNVisualizationData;
    context: VisualisationRenderContext;
    props: KNNRenderProps;
}
