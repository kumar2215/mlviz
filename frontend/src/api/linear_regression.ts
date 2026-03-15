/**
 * Linear Regression API Interface
 * Provides functions for interacting with the Linear Regression backend endpoints.
 * Types derived from auto-generated OpenAPI spec (src/types/api.ts).
 */

import { API_BASE_URL as BASE_URL } from "@/api/config";
import type { ParameterInfo } from "@/api/types";
import type { components } from "@/types/api";

// ============================================================================
// Type Aliases (auto-generated from OpenAPI spec)
// ============================================================================

export type LinearRegressionParameters =
    components["schemas"]["LinearRegressionParameters"];

export type LinearRegressionVisualisationRequest =
    components["schemas"]["LinearRegressionVisualisationRequest"];
export type LinearRegressionVisualisationResponse =
    components["schemas"]["LinearRegressionVisualisationResponse"];

export type LinearRegressionTrainRequest =
    components["schemas"]["LinearRegressionTrainRequest"];
export type LinearRegressionTrainResponse =
    components["schemas"]["LinearRegressionTrainResponse"];

export type LinearRegressionStepRequest =
    components["schemas"]["LinearRegressionStepRequest"];
export type LinearRegressionStepResponse =
    components["schemas"]["LinearRegressionStepResponse"];

export interface LinearRegressionEvaluateRequest {
    slope: number;
    intercept: number;
    points: number[][];
}

export interface LinearRegressionEvaluateResponse {
    success: boolean;
    metrics: components["schemas"]["RegressionMetrics"];
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = `${BASE_URL}/api/linear`;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get the available parameters for Linear Regression configuration.
 */
export const getParameters = async (): Promise<ParameterInfo[]> => {
    const response = await fetch(`${API_BASE_URL}/params`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
};

/**
 * Return raw scatter data for the chosen feature vs target (no fitting).
 * The frontend renders the scatter plot and computes R² live for any user-controlled line.
 */
export const visualise = async (
    request: LinearRegressionVisualisationRequest = {}
): Promise<LinearRegressionVisualisationResponse> => {
    const response = await fetch(`${API_BASE_URL}/visualise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    const data: LinearRegressionVisualisationResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(
            (data as any).detail || `HTTP error! status: ${response.status}`
        );
    }
    return data;
};

/**
 * Fit an OLS Linear Regression model and return the optimal line + metrics.
 */
export const train = async (
    request: LinearRegressionTrainRequest = {}
): Promise<LinearRegressionTrainResponse> => {
    const response = await fetch(`${API_BASE_URL}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    const data: LinearRegressionTrainResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(
            (data as any).detail || `HTTP error! status: ${response.status}`
        );
    }
    return data;
};

/**
 * Perform a single gradient descent step (stateless).
 * Frontend passes current slope/intercept; backend returns proposed update.
 */
export const step = async (
    request: LinearRegressionStepRequest
): Promise<LinearRegressionStepResponse> => {
    const response = await fetch(`${API_BASE_URL}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    const data: LinearRegressionStepResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(
            (data as any).detail || `HTTP error! status: ${response.status}`
        );
    }
    return data;
};

/**
 * Evaluate an arbitrary line against the given points.
 */
export const evaluate = async (
    request: LinearRegressionEvaluateRequest
): Promise<LinearRegressionEvaluateResponse> => {
    const response = await fetch(`${API_BASE_URL}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    const data: LinearRegressionEvaluateResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(
            (data as any).detail || `HTTP error! status: ${response.status}`
        );
    }
    return data;
};
