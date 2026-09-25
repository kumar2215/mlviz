import { API_BASE_URL as BASE_URL } from "@/api/config";
import type { ParameterInfo } from "@/api/types";
import type { components } from "@/types/api";

// Type aliases: auto generated from OpenAPI spec.

export type DecisionTreeRequest =
    components["schemas"]["DecisionTreeTrainingRequest"];
export type DecisionTreeResponse =
    components["schemas"]["DecisionTreeTrainingResponse"];

const API_BASE_URL = `${BASE_URL}/api/dt`;

/**
 * Gets the parameters of the decision tree parameters.
 * @returns A promise resolving to ModelStatusResponse.
 */
export const getParameters = async (): Promise<ParameterInfo[]> => {
    const response = await fetch(`${API_BASE_URL}/train_params`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

/**
 * Initiates model training and retrieves its initial metrics and tree structure.
 * This function also leverages the backend's caching mechanism,
 * so it will return a cached model if one exists for the given parameters.
 * @param params Optional parameters for training the model. Defaults to server-side defaults if not provided.
 * @returns A promise resolving to DecisionTreeResponse, which includes all model details and performance metrics.
 */
export const trainModel = async (
    params: Partial<DecisionTreeRequest> = {}
): Promise<DecisionTreeResponse> => {
    const response = await fetch(`${API_BASE_URL}/train`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
    });

    const data: DecisionTreeResponse = await response.json();

    if (!response.ok || !data.success) {
        const errorMessage =
            (data as any).message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
    }

    return data;
};

/**
 * Calculates statistics for a potential node split in manual tree building.
 * @param request Manual node statistics request
 * @returns A promise resolving to node statistics and masks
 */
export const calculateNodeStats = async (
    request: components["schemas"]["ManualNodeStatsRequest"]
): Promise<components["schemas"]["ManualNodeStatsResponse"]> => {
    const response = await fetch(`${API_BASE_URL}/manual/node-stats`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};

/**
 * Calculates statistics for all possible thresholds of a feature.
 * @param request Manual feature statistics request
 * @returns A promise resolving to threshold statistics and feature metadata
 */
export const calculateFeatureStats = async (
    request: components["schemas"]["ManualFeatureStatsRequest"]
): Promise<components["schemas"]["ManualFeatureStatsResponse"]> => {
    const response = await fetch(`${API_BASE_URL}/manual/feature-stats`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};

/**
 * Evaluates a manually built tree against test data.
 * @param request Manual tree evaluation request
 * @returns A promise resolving to evaluation metrics and confusion matrix
 */
export const evaluateManualTree = async (
    request: components["schemas"]["ManualTreeEvaluateRequest"]
): Promise<components["schemas"]["ManualTreeEvaluateResponse"]> => {
    const response = await fetch(`${API_BASE_URL}/manual/evaluate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};

// Type aliases for prediction with traversal instructions
export type PredictWithInstructionsRequest =
    components["schemas"]["DecisionTreeTraversalPredictRequest"];
export type PredictWithInstructionsResponse =
    components["schemas"]["DecisionTreeTraversalPredictResponse"];

/**
 * Makes a prediction using the decision tree and returns traversal instructions.
 * The instructions can be used by the frontend to animate the prediction path.
 * @param request Prediction request with tree, feature values, and optional class names
 * @returns A promise resolving to prediction result with traversal instructions
 */
export const predictWithInstructions = async (
    request: PredictWithInstructionsRequest
): Promise<PredictWithInstructionsResponse> => {
    const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};
