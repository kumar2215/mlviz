import { create } from "zustand";

interface DragSelectionState {
    selections: Record<string, string | null>;
    registerSurface: (surfaceId: string) => void;
    removeSurface: (surfaceId: string) => void;
    select: (surfaceId: string, itemId: string | null) => void;
}

export const useDragSelectionStore = create<DragSelectionState>()((set, get) => ({
    selections: {},
    registerSurface: surfaceId => {
        if (Object.prototype.hasOwnProperty.call(get().selections, surfaceId)) return;
        set(state => ({ selections: { ...state.selections, [surfaceId]: null } }));
    },
    removeSurface: surfaceId => {
        const selections = { ...get().selections };
        delete selections[surfaceId];
        set({ selections });
    },
    select: (surfaceId, itemId) => {
        if (!Object.prototype.hasOwnProperty.call(get().selections, surfaceId)) return;
        set(state => ({ selections: { ...state.selections, [surfaceId]: itemId } }));
    },
}));
