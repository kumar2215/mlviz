/**
 * API methods for Support Vector Machine (SVM) Classification
 */
import { API_BASE_URL as BASE_URL } from "@/api/config";
import type { ParameterInfo } from "@/api/types";
import type { components } from "@/types/api";

export type SVMTrainRequest = components["schemas"]["SVMTrainRequest"];
export type SVMTrainResponse = components["schemas"]["SVMTrainResponse"];
export type SVMPredictRequest = components["schemas"]["SVMPredictRequest"];
export type SVMPredictResponse = components["schemas"]["SVMPredictResponse"];
export type SVMStepRequest = components["schemas"]["SVMStepRequest"];
export type SVMStepResponse = components["schemas"]["SVMStepResponse"];
export type SVMVisualisationRequest = components["schemas"]["SVMVisualisationRequest"];
export type SVMVisualisationResponse = components["schemas"]["SVMVisualisationResponse"];

// For internal frontend use if needed
export interface SVMPoint {
    id: number;
    x: [number, number];
    y: number; // class label
    margin_distance?: number;
    is_support_vector?: boolean;
}

const API_BASE_URL = `${BASE_URL}/api/svm`;

// --- API Calls ---

export const getParameters = async (): Promise<ParameterInfo[]> => {
    const response = await fetch(`${API_BASE_URL}/params`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
};

export const trainSVM = async (
    request: Partial<SVMTrainRequest> = {}
): Promise<SVMTrainResponse> => {
    const response = await fetch(`${API_BASE_URL}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    const data: SVMTrainResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error((data as any).detail || `HTTP error! status: ${response.status}`);
    }
    return data;
};

export const getSVMPrediction = async (
    request: Partial<SVMPredictRequest> = {}
): Promise<SVMPredictResponse> => {
    const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    const data: SVMPredictResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error((data as any).detail || `HTTP error! status: ${response.status}`);
    }
    return data;
};

export const stepSVM = async (
    request: Partial<SVMStepRequest>
): Promise<SVMStepResponse> => {
    const response = await fetch(`${API_BASE_URL}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    const data: SVMStepResponse = await response.json();
    if (!response.ok || !data.success) {
        throw new Error((data as any).detail || `HTTP error! status: ${response.status}`);
    }
    return data;
};
