import { API_BASE_URL } from "@/api/config";
import type { components } from "@/types/api";
import type { PorterDataset, RegexDataset } from "@/types/dataset";
import { postJson } from "./postJson";

export type RegexState = components["schemas"]["RegexStateResponse"];
export type RegexPreview = components["schemas"]["RegexPreviewResponse"];
export type PorterState = components["schemas"]["PorterStateResponse"];
export type PorterAnswer = components["schemas"]["PorterAnswer"];
type Check = components["schemas"]["CheckResponse"];
export type RegexGoal = components["schemas"]["RegexGoal"];
export type RegexFlag = NonNullable<components["schemas"]["RegexChoiceRequest"]["flags"]>[number];

async function post<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
    return postJson<T>(`${API_BASE_URL}/api/tokenization/${path}`, body, signal);
}

export const loadRegexState = (dataset: RegexDataset) =>
    post<RegexState>("regex/state", { dataset });

export const previewRegex = (dataset: RegexDataset, pattern: string, flags: RegexFlag[], signal?: AbortSignal) =>
    post<RegexPreview>("regex/preview", { dataset, pattern, flags }, signal);

export const checkRegex = (dataset: RegexDataset, pattern: string, flags: RegexFlag[], goal_id: string) =>
    post<Check>("regex/check", { dataset, pattern, flags, goal_id });

export const loadPorterState = (dataset: PorterDataset) =>
    post<PorterState>("porter/state", { dataset });

export const checkPorter = (dataset: PorterDataset, answers: PorterAnswer[]) =>
    post<Check>("porter/check", { dataset, answers });

export const checkPorterStep = (dataset: PorterDataset, word: string, step_index: number, answer: string) =>
    post<Check>("porter/check-step", { dataset, word, step_index, answer });

export const checkPorterPlacement = (dataset: PorterDataset, word: string, stem: string) =>
    post<Check>("porter/check-placement", { dataset, word, stem });
