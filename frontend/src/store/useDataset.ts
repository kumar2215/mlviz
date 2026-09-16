import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ActiveDataset } from "@/types/dataset";

interface DatasetStore {
    activeDataset: ActiveDataset | null;
    setDataset: (dataset: ActiveDataset | null) => void;
    clearDataset: () => void;
}

export const useDataset = create<DatasetStore>()(
    persist(
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
        })),
        {
            name: 'dataset-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
