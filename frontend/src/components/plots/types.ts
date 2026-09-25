// Core types for the abstract plotting framework
// Supports both classification and regression tasks across 1D-3D visualizations

import type { ContinuousSchemeName, PaletteName } from "@/utils/colorUtils";

// ============================================================================
// Point Types
// ============================================================================

/**
 * Base plot point with coordinates and original index
 */
interface BasePlotPoint {
    coordinates: number[]; // [x] or [x, y] or [x, y, z]
    originalIndex: number; // Index in original dataset
}

/**
 * Classification point with discrete class label
 */
export interface ClassificationPoint extends BasePlotPoint {
    type: "classification";
    label: string; // e.g., "setosa", "versicolor"
    classIndex: number; // Index in classNames array
}

/**
 * Regression point with continuous target value
 */
export interface RegressionPoint extends BasePlotPoint {
    type: "regression";
    value: number; // Continuous target value
}

/**
 * Union type for all plot points
 */
export type PlotPoint = ClassificationPoint | RegressionPoint;

// ============================================================================
// Decision Boundary Types
// ============================================================================

interface BaseBoundary {
    type: "regression" | "classification" | "clustering";
    meshPoints: number[][]; // Grid of coordinates
    predictions: number[] | string[]; // Numeric prediction at each mesh point
    dimensions: number; // 1, 2, or 3
}

/**
 * Classification decision boundary with discrete predictions
 */
interface ClassificationBoundary extends BaseBoundary {
    type: "classification";
    predictions: string[]; // Class prediction at each mesh point
}

/**
 * Clustering decision boundary with discrete cluster predictions
 */
interface ClusteringBoundary extends BaseBoundary {
    type: "clustering";
    predictions: number[] | string[]; // Cluster ID or Cluster Name at each mesh point
}

/**
 * Regression decision boundary with continuous predictions
 */
interface RegressionBoundary extends BaseBoundary {
    type: "regression";
    predictions: number[]; // Numeric prediction at each mesh point
}

export type DecisionBoundary =
    | ClassificationBoundary
    | ClusteringBoundary
    | RegressionBoundary;

// ============================================================================
// Plot Configuration Types
// ============================================================================

/**
 * Bounds for plot axes
 */
export interface PlotBounds {
    min: number[]; // Minimum value per dimension
    max: number[]; // Maximum value per dimension
    range: number[]; // Range per dimension (max - min)
}

type TaskType = "classification" | "clustering" | "regression";

interface BaseConfig {
    type: TaskType;
}

/**
 * Configuration for classification tasks
 */
export interface ClassificationConfig extends BaseConfig {
    type: "classification";
    labels: string[]; // Class label for each data point
    classNames: string[]; // Unique class names
    colorScheme?: PaletteName; // Categorical color scheme (default: "default")
}

/**
 * Configuration for clustering tasks (e.g., KMeans)
 */
export interface ClusteringConfig extends BaseConfig {
    type: "clustering";
    labels: string[]; // Cluster label for each data point
    clusterNames: string[]; // Unique cluster names
    colorScheme?: PaletteName; // Categorical color scheme (default: "default")
}

/**
 * Configuration for regression tasks
 */
export interface RegressionConfig extends BaseConfig {
    type: "regression";
    values: number[]; // Target value for each data point
    colorScheme?: ContinuousSchemeName; // Continuous color scheme (default: "viridis")
    valueRange?: [number, number]; // Optional explicit value range for color scale
}

export type Config = ClassificationConfig | ClusteringConfig | RegressionConfig;

export type Prediction = string | number;
