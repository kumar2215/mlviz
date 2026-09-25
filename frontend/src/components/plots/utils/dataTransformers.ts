/**
 * Data transformation utilities for converting various data formats
 * into standardized plot points and decision boundaries
 */

import type {
    ClassificationPoint,
    Config,
    DecisionBoundary,
    PlotBounds,
    PlotPoint,
    RegressionPoint,
} from "@/components/plots/types";

// ============================================================================
// Plot Point Transformers
// ============================================================================

/**
 * Transforms raw data into classification plot points
 */
function createClassificationPoints(
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
function createRegressionPoints(
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
// Bounds Calculation
// ============================================================================

/**
 * Calculates plot bounds from data points with optional padding
 */
function calculatePlotBounds(
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
