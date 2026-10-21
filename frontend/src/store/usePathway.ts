import { useStore } from "zustand";
import { createPathwayStore, type PathwayState } from "./pathwayStore";
import type { HistoryState } from "@/types/history";

const emptyHistory: HistoryState = { params: {}, entries: [], path: [] };
export const pathwayStore = createPathwayStore({ pages: [], transitions: [] }, {
    getHistory: () => emptyHistory,
    subscribe: () => () => {},
    addPageVisit: () => {},
    recordAction: () => {},
});

export function usePathway<T>(selector: (state: PathwayState) => T): T {
    return useStore(pathwayStore, selector);
}
