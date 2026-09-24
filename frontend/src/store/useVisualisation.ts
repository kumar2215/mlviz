import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useConfig } from '@/store/useConfig';
import type Visualisation from '@/types/visualisation';
import type { HistoryEntry, VisualisationHistoryState } from "@/types/history";

interface VisualisationStore {
    currentVisualisation: Visualisation | null;
    currentVisualisationHistory: VisualisationHistoryState;
    visualisations: Record<string, Visualisation>;
    loading: boolean;
    error: string | null;
    fetchVisualisations: (category: string) => Promise<void>;
    addPageVisit: (pageId: number) => void;
    getPreviousPageId: () => number | undefined;
    recordAction: (action: HistoryEntry) => void;
    updateParams: (paramUpdates: Record<string, any>) => void;
}

export const useVisualisation = create<VisualisationStore>()(
    immer((set, get) => ({
        currentVisualisation: null,
        currentVisualisationHistory: {
            visualisation_id: "",
            params: {},
            entries: [],
            path: []
        },
        visualisations: {},
        loading: false,
        error: null,
        fetchVisualisations: async (category: string) => {
            const visualisations = Object.values(get().visualisations).filter(v => v.category === category);
            if (visualisations.length > 0) return; // Already loaded for this category
            set(state => { state.loading = true; state.error = null; });
            try {
                const viz_files = useConfig.getState().config?.categories.find((cat) => cat.config_path === category)?.files;
                if (!viz_files || viz_files.length === 0) {
                    throw new Error(`No visualisation files found for category: ${category}`);
                }

                const visualisations = await Promise.all(
                    viz_files.map(async (file) => {
                        const filePath = `config/visual/${category}/${file}`;
                        const response = await fetch(`${import.meta.env.BASE_URL}${filePath}`);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch visualisation file: ${filePath}, status: ${response.statusText}`);
                        }
                        const data = await response.json();
                        return { ...data, category, name: file.replace('.json', '') } as Visualisation;
                    })
                ) as Visualisation[];

                set(state => {
                    for (const v of visualisations) {
                        state.visualisations[v.name] = v;
                    }
                    state.loading = false;
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error("Error loading config:", err);
                set(state => {
                    state.error = message;
                    state.loading = false;
                });
            }
        },
        addPageVisit: (pageId: number) => {
            set((state) => {
                state.recordAction({ actionType: "page_visit", timestamp: Date.now(), page_id: pageId });
                state.currentVisualisationHistory.path.push(pageId);
            });
        },
        getPreviousPageId: () => {
            const path = get().currentVisualisationHistory.path;
            if (path.length === 0) return undefined;
            const lastPageId = path[path.length - 1];
            set((state) => {
                state.currentVisualisationHistory.path.pop();
            });
            return lastPageId;
        },
        recordAction: (action: HistoryEntry) => {
            set((state) => {
                state.currentVisualisationHistory.entries.push(action);
            });
        },
        updateParams: (paramUpdates: Record<string, any>) => {
            set((state) => {
                const currentParams = state.currentVisualisationHistory.params;
                state.currentVisualisationHistory.params = { ...currentParams, ...paramUpdates };
            });
        }
    }))
);

export function getCurrentVisualisation(): Visualisation | null {
    return useVisualisation.getState().currentVisualisation;
}

export function setCurrentVisualisation(visualisation: Visualisation) {
    useVisualisation.setState(state => {
        state.currentVisualisation = visualisation;
        state.currentVisualisationHistory = {
            visualisation_id: visualisation.name || "",
            params: {},
            entries: [],
            path: []
        };
    });
}
