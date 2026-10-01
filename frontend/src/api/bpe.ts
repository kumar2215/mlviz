import { API_BASE_URL } from "@/api/config";
import type { PredefinedBpeDataset } from "@/types/dataset";
import type { components } from "@/types/api";

export type BpeState = components["schemas"]["BpeStateResponse"];
export type BpePair = components["schemas"]["BpePair"];
export type BpeCountAnswer = components["schemas"]["BpeCountAnswer"];
export type BpeTokenAnswer = components["schemas"]["BpeTokenAnswer"];
type BpeCheck = components["schemas"]["BpeCheckResponse"];

async function post<T>(path: string, body: object): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/api/bpe/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || `BPE request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
}

export const loadBpeState = (dataset: PredefinedBpeDataset) =>
    post<BpeState>("state", { dataset });

export const checkBpeCounts = (dataset: PredefinedBpeDataset, round_index: number, answers: BpeCountAnswer[]) =>
    post<BpeCheck>("check-counts", { dataset, round_index, answers });

export const checkBpeMerge = (dataset: PredefinedBpeDataset, round_index: number, pair: BpePair) =>
    post<BpeCheck>("check-merge", { dataset, round_index, pair });

export const checkBpeRestore = (dataset: PredefinedBpeDataset, round_index: number, selected_index: number, right_index: number) =>
    post<BpeCheck>("check-restore", { dataset, round_index, selected_index, right_index });

export const checkBpeTokenizations = (dataset: PredefinedBpeDataset, answers: BpeTokenAnswer[]) =>
    post<BpeCheck>("check-tokenizations", { dataset, answers });
