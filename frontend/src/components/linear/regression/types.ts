/**
 * Shared type definitions for Linear Regression visualisation components.
 */

export interface LinearRegressionPoint {
    x: number;
    y: number;
}

export interface LinearRegressionLineParams {
    slope: number;
    intercept: number;
}

export interface LinearRegressionVisualisationData {
    /** Scatter points [[x, y], ...] */
    points: number[][];
    xRange: [number, number];
    yRange: [number, number];
    featureXName: string;
    targetName: string;
    featureNames: string[];
    nSamples: number;
    /** Optimal OLS line (present after training) */
    optimalLine?: LinearRegressionLineParams;
}
