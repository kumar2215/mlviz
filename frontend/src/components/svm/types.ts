/**
 * Shared type definitions for SVM Classification visualisation components.
 */

export interface SVMPoint {
    x1: number;
    x2: number;
    y: number; // class label
    isSupportVector?: boolean;
}

export interface SVMVisualisationData {
    points: number[][]; // [x1, x2]
    labels: number[];
    optimal_w1?: number;
    optimal_w2?: number;
    optimal_b?: number;
    support_vector_indices?: number[];
    xRange: [number, number];
    yRange: [number, number];
    featureNames: string[];
    nSamples: number;
}
