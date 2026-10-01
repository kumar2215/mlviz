import { API_BASE_URL } from "@/api/config";
import type { components } from "@/types/api";
import type { PredefinedPorterDataset, PredefinedRegexDataset } from "@/types/dataset";

export type RegexState = components["schemas"]["RegexStateResponse"];
export type RegexPreview = components["schemas"]["RegexPreviewResponse"];
export type PorterState = components["schemas"]["PorterStateResponse"];
export type PorterAnswer = components["schemas"]["PorterAnswer"];
type Check = components["schemas"]["CheckResponse"];

async function post<T>(path: string, body: object): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/api/tokenization/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || `Tokenization request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
}

export const loadRegexState = (dataset: PredefinedRegexDataset) =>
    post<RegexState>("regex/state", { dataset });

export const previewRegex = (dataset: PredefinedRegexDataset, option_id: string) =>
    post<RegexPreview>("regex/preview", { dataset, option_id });

export const checkRegex = (dataset: PredefinedRegexDataset, option_id: string) =>
    post<Check>("regex/check", { dataset, option_id });

export const loadPorterState = (dataset: PredefinedPorterDataset) =>
    post<PorterState>("porter/state", { dataset });

export const checkPorter = (dataset: PredefinedPorterDataset, answers: PorterAnswer[]) =>
    post<Check>("porter/check", { dataset, answers });
