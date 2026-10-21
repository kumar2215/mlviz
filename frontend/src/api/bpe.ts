import { API_BASE_URL } from "@/api/config";
import type { BpeDataset } from "@/types/dataset";
import type { components } from "@/types/api";
import { postJson } from "./postJson";

export type BpeState = components["schemas"]["BpeStateResponse"];
export type BpePair = components["schemas"]["BpePair"];
export type BpeCountAnswer = components["schemas"]["BpeCountAnswer"];
export type BpeTokenAnswer = components["schemas"]["BpeTokenAnswer"];
type BpeCheck = components["schemas"]["BpeCheckResponse"];

async function post<T>(path: string, body: object): Promise<T> {
    return postJson<T>(`${API_BASE_URL}/api/bpe/${path}`, body);
}

export const loadBpeState = (dataset: BpeDataset) =>
    post<BpeState>("state", { dataset });

export const checkBpeCounts = (dataset: BpeDataset, round_index: number, answers: BpeCountAnswer[]) =>
    post<BpeCheck>("check-counts", { dataset, round_index, answers });

export const checkBpeMerge = (dataset: BpeDataset, round_index: number, pair: BpePair) =>
    post<BpeCheck>("check-merge", { dataset, round_index, pair });

export const checkBpeRestore = (dataset: BpeDataset, round_index: number, selected_index: number, right_index: number) =>
    post<BpeCheck>("check-restore", { dataset, round_index, selected_index, right_index });

export const checkBpeTokenizations = (dataset: BpeDataset, answers: BpeTokenAnswer[]) =>
    post<BpeCheck>("check-tokenizations", { dataset, answers });

export type BpeApplication = components["schemas"]["BpeApplyStateResponse"];
export const loadBpeApplication = (dataset: BpeDataset) => post<BpeApplication>("apply/state", { dataset });
export const applyBpePair = (request: components["schemas"]["BpeApplyMoveRequest"]) =>
    post<components["schemas"]["BpeApplyMoveResponse"]>("apply/merge", request);
