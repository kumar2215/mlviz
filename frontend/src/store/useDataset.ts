import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ActiveDataset } from "@/types/dataset";

interface DatasetStore {
    activeDataset: ActiveDataset | null;
    setDataset: (dataset: ActiveDataset | null) => void;
    clearDataset: () => void;
}

export const useDataset = create<DatasetStore>()(
    immer((set) => ({
        activeDataset: null,
        setDataset: (dataset) => {
            set((state) => {
                state.activeDataset = dataset;
            });
        },
        clearDataset: () => {
            set((state) => {
                state.activeDataset = null;
            });
        },
    }))
);
