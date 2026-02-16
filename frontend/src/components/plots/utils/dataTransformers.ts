/**
 * Data transformation utilities for converting various data formats
 * into standardized plot points and decision boundaries
 */

import type {
    ClassificationBoundary,
    ClassificationPoint,
    Config,
    DecisionBoundary,
    PlotBounds,
    PlotPoint,
    RegressionBoundary,
    RegressionPoint,
} from "@/components/plots/types";

// ============================================================================
// Plot Point Transformers
// ============================================================================

/**
 * Transforms raw data into classification plot points
 */
export function createClassificationPoints(
    data: number[][],
    labels: string[],
    classNames: string[],
): ClassificationPoint[] {
    if (data.length !== labels.length) {
        throw new Error("Data and labels must have the same length");
    }

    return data.map((coordinates, originalIndex) => {
        const label = labels[originalIndex];
        const classIndex = classNames.indexOf(label);

        if (classIndex === -1) {
            throw new Error(
                `Label "${label}" not found in classNames: ${classNames.join(
                    ", ",
                )}`,
            );
        }

        return {
            type: "classification",
            coordinates,
            originalIndex,
            label,
            classIndex,
        };
    });
}

/**
 * Transforms raw data into regression plot points
 */
export function createRegressionPoints(
    data: number[][],
    values: number[],
): RegressionPoint[] {
    if (data.length !== values.length) {
        throw new Error("Data and values must have the same length");
    }

    return data.map((coordinates, originalIndex) => ({
        type: "regression",
        coordinates,
        originalIndex,
        value: values[originalIndex],
    }));
}

/**
 * Universal plot point creator that handles classification, clustering, and regression
 */
export function createPlotPoints(
    data: number[][],
    config: Config,
): PlotPoint[] {
    if (config.type === "classification" || config.type === "clustering") {
        return createClassificationPoints(
            data,
            config.labels,
            config.type === "classification"
                ? config.classNames
                : config.clusterNames,
        );
    } else {
        return createRegressionPoints(data, config.values);
    }
}

// ============================================================================
// Decision Boundary Transformers
// ============================================================================

/**
 * Creates a classification decision boundary from mesh data
 */
export function createClassificationBoundary(
    meshPoints: number[][],
    predictions: string[],
): ClassificationBoundary {
    if (meshPoints.length !== predictions.length) {
        throw new Error(
            "Mesh points and predictions must have the same length",
        );
    }

    const dimensions = meshPoints[0]?.length || 0;

    return {
        type: "classification",
        meshPoints,
        predictions,
        dimensions,
    };
}

/**
 * Creates a regression decision boundary from mesh data
 */
export function createRegressionBoundary(
    meshPoints: number[][],
    predictions: number[],
): RegressionBoundary {
    if (meshPoints.length !== predictions.length) {
        throw new Error(
            "Mesh points and predictions must have the same length",
        );
    }

    const dimensions = meshPoints[0]?.length || 0;

    return {
        type: "regression",
        meshPoints,
        predictions,
        dimensions,
    };
}

/**
 * Universal decision boundary creator
 */
export function createDecisionBoundary(
    meshPoints: number[][],
    predictions: string[] | number[],
    type: "classification" | "regression",
): DecisionBoundary {
    if (type === "classification") {
        return createClassificationBoundary(
            meshPoints,
            predictions as string[],
        );
    } else {
        return createRegressionBoundary(meshPoints, predictions as number[]);
    }
}

// ============================================================================
// Bounds Calculation
// ============================================================================

/**
 * Calculates plot bounds from data points with optional padding
 */
export function calculatePlotBounds(
    data: number[][],
    padding: number = 0.1,
): PlotBounds {
    if (data.length === 0) {
        return { min: [], max: [], range: [] };
    }

    const dimensions = data[0].length;
    const min: number[] = [];
    const max: number[] = [];
    const range: number[] = [];

    for (let d = 0; d < dimensions; d++) {
        const values = data.map((point) => point[d]);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const rangeVal = maxVal - minVal;

        // Apply padding
        const paddingAmount = rangeVal * padding;
        min.push(minVal - paddingAmount);
        max.push(maxVal + paddingAmount);
        range.push(rangeVal + 2 * paddingAmount);
    }

    const result = { min, max, range };
    console.log("[calculatePlotBounds] Calculated bounds:", result);
    return result;
}

/**
 * Calculates bounds including both data points and decision boundary mesh
 */
export function calculateCombinedBounds(
    data: number[][],
    decisionBoundary?: DecisionBoundary,
    padding: number = 0.1,
): PlotBounds {
    // If decision boundary is available, use its mesh points exclusively
    // Usually we want 0 padding for decision boundaries as they define the full plot area
    if (decisionBoundary && decisionBoundary.meshPoints.length > 0) {
        const bounds = calculatePlotBounds(decisionBoundary.meshPoints, 0);
        console.log("[calculateCombinedBounds] Using decision boundary bounds:", bounds, {
            meshPoints: decisionBoundary.meshPoints.length,
            originalDataPoints: data.length
        });
        return bounds;
    }

    const bounds = calculatePlotBounds(data, padding);
    console.log("[calculateCombinedBounds] Using data points bounds:", bounds, {
        dataPoints: data.length,
        padding
    });
    return bounds;
}

// ============================================================================
// Dimension Detection
// ============================================================================

/**
 * Detects the number of dimensions in the data
 */
export function detectDimensions(data: number[][]): 1 | 2 {
    if (data.length === 0) {
        throw new Error("Cannot detect dimensions from empty data");
    }

    const dims = data[0].length;

    if (dims < 1 || dims > 3) {
        throw new Error(
            `Unsupported number of dimensions: ${dims}. Expected 1, 2, or 3.`,
        );
    }

    return dims as 1 | 2;
}

/**
 * Validates that all data points have consistent dimensions
 */
export function validateDimensions(data: number[][]): void {
    if (data.length === 0) return;

    const expectedDims = data[0].length;

    for (let i = 1; i < data.length; i++) {
        if (data[i].length !== expectedDims) {
            throw new Error(
                `Inconsistent dimensions: point ${i} has ${data[i].length} dimensions, expected ${expectedDims}`,
            );
        }
    }
}

// ============================================================================
// Data Validation
// ============================================================================

/**
 * Validates plot data and configuration
 */
export function validatePlotData(
    data: number[][],
    config: Config,
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check empty data
    if (data.length === 0) {
        errors.push("Data array is empty");
    }

    // Validate dimensions
    try {
        validateDimensions(data);
    } catch (e) {
        errors.push((e as Error).message);
    }

    // Validate config-specific requirements
    if (config.type === "classification") {
        if (config.labels.length !== data.length) {
            errors.push(
                `Labels length (${config.labels.length}) does not match data length (${data.length})`,
            );
        }
        if (config.classNames.length === 0) {
            errors.push("classNames array is empty");
        }
    } else if (config.type === "clustering") {
        if (config.labels.length !== data.length) {
            errors.push(
                `Labels length (${config.labels.length}) does not match data length (${data.length})`,
            );
        }
        if (config.clusterNames.length === 0) {
            errors.push("clusterNames array is empty");
        }
    } else {
        if (config.values.length !== data.length) {
            errors.push(
                `Values length (${config.values.length}) does not match data length (${data.length})`,
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Finds unique class names from labels
 */
export function extractClassNames(labels: string[]): string[] {
    return Array.from(new Set(labels)).sort();
}

/**
 * Calculates value range for regression data
 */
export function calculateValueRange(values: number[]): [number, number] {
    if (values.length === 0) {
        return [0, 1];
    }
    return [Math.min(...values), Math.max(...values)];
}
