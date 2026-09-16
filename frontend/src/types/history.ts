import type { Parameters } from '@/types/page';

export type ActionType =
    | "train"
    | "predict"
    | "step"
    | "manual_evaluate"
    | "page_visit"
    | "button_click";

export interface HistoryEntry {
    actionType: ActionType;
    timestamp: number;
    page_id?: number;    // for page_visit
    button_id?: string;  // for button_click
    params?: Parameters; // for train / step / predict
    metrics?: Record<string, any>; // for train / step results
}

export interface VisualisationHistoryState {
    visualisation_id: string;
    params: Record<string, Parameters>;
    entries: HistoryEntry[];
    path: number[];
}
