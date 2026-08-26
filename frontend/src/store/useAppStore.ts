import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type { Config, EdgeNode, HistoryEntry, Parameters, StoryHistory } from "@/types/story";
import type { components } from "@/types/api";

// DATASET TYPES
export type Dataset = components["schemas"]["Dataset"];
export type PredefinedDataset = components["schemas"]["PredefinedDataset"];
export type ActiveDataset = PredefinedDataset | Dataset;

// STORY TYPES
interface StoryState {
    path: EdgeNode[];
    params: Record<string, Parameters>;
    history: StoryHistory;
}

const generateDefaultStoryState = (): StoryState => ({
    path: [],
    params: {},
    history: { entries: [], pagesVisited: [] },
});

const DEFAULT_STORY_STATE = generateDefaultStoryState();


// STORE SLICES
interface ConfigSlice {
    config: Config | null;
    loading: boolean;
    error: string | null;
    fetchConfig: () => Promise<void>;
}

interface DatasetSlice {
    activeDataset: ActiveDataset | null;
    setDataset: (dataset: ActiveDataset | null) => void;
    clearDataset: () => void;
}

interface StorySlice {
    stories: Record<string, StoryState>;
    currentStoryId: string | null;
    setCurrentStoryId: (storyId: string) => void;
    
    // Actions on the current story
    updateCurrentStoryState: (updates: Partial<StoryState>) => void;
    updateCurrentParams: (paramUpdates: Record<string, any>) => void;
    resetCurrentStoryState: () => void;
    addCurrentEdge: (edge: EdgeNode) => void;
    popCurrentPath: () => EdgeNode | undefined;
    recordCurrentAction: (action: HistoryEntry) => void;

    // Raw actions, for multi-story management if ever needed
    _updateStoryState: (storyId: string, updates: Partial<StoryState>) => void;
    _resetStoryState: (storyId: string) => void;
}

type AppState = ConfigSlice & DatasetSlice & StorySlice;

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // CONFIG SLICE
            config: null,
            loading: true,
            error: null,
            fetchConfig: async () => {
                set({ loading: true, error: null });
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const configParam = urlParams.get("config") || import.meta.env.VITE_CONFIG_FILE || "config";
                    const configPath = configParam.includes("/") ? configParam : `config/${configParam}.json`;
                    
                    const response = await fetch(`${import.meta.env.BASE_URL}${configPath}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch config: ${response.statusText}`);
                    }
                    const data = await response.json();
                    set({ config: data as Config, loading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    console.error("Error loading config:", err);
                    set({ error: message, loading: false });
                }
            },

            // DATASET SLICE
            activeDataset: null,
            setDataset: (dataset) => {
                console.log("[AppStore] Setting active dataset:", dataset);
                set({ activeDataset: dataset });
            },
            clearDataset: () => {
                console.log("[AppStore] Clearing active dataset");
                set({ activeDataset: null });
            },

            // STORY SLICE
            stories: {},
            currentStoryId: null,
            setCurrentStoryId: (storyId) => set({ currentStoryId: storyId }),
            
            _updateStoryState: (storyId, updates) => {
                set((state) => {
                    const currentState = state.stories[storyId] || generateDefaultStoryState();
                    return {
                        stories: {
                            ...state.stories,
                            [storyId]: { ...currentState, ...updates },
                        },
                    };
                });
            },

            _resetStoryState: (storyId) => {
                set((state) => ({
                    stories: {
                        ...state.stories,
                        [storyId]: generateDefaultStoryState(),
                    },
                }));
            },

            // Actions on the current story (derived from raw actions)
            updateCurrentStoryState: (updates) => {
                const storyId = get().currentStoryId;
                if (!storyId) return;
                get()._updateStoryState(storyId, updates);
            },
            
            resetCurrentStoryState: () => {
                const storyId = get().currentStoryId;
                if (!storyId) return;
                get()._resetStoryState(storyId);
            },

            updateCurrentParams: (paramUpdates) => {
                const storyId = get().currentStoryId;
                if (!storyId) return;
                set((state) => {
                    const story = state.stories[storyId] || generateDefaultStoryState();
                    return {
                        stories: {
                            ...state.stories,
                            [storyId]: {
                                ...story,
                                params: { ...story.params, ...paramUpdates },
                            },
                        },
                    };
                });
            },

            addCurrentEdge: (edge) => {
                const storyId = get().currentStoryId;
                if (!storyId) return;
                console.log('[AppStore] addEdge called:', { storyId, edge });
                set((state) => {
                    const story = state.stories[storyId] || generateDefaultStoryState();
                    const currentPath = story.path || [];

                    const lastEdge = currentPath[currentPath.length - 1];
                    if (lastEdge && lastEdge.local_index === edge.local_index && lastEdge.story_name === edge.story_name) {
                        console.log('[AppStore] Skipping duplicate edge');
                        return state;
                    }
                    return {
                        stories: {
                            ...state.stories,
                            [storyId]: {
                                ...story,
                                path: [...currentPath, edge],
                            },
                        },
                    };
                });
            },

            popCurrentPath: () => {
                const storyId = get().currentStoryId;
                if (!storyId) return undefined;

                const story = get().stories[storyId];
                if (!story || !story.path || story.path.length === 0) {
                    return undefined;
                }
                
                const poppedEdge = story.path[story.path.length - 1];
                console.log('[AppStore] popPath - popping:', poppedEdge);

                set((state) => {
                    return {
                        stories: {
                            ...state.stories,
                            [storyId]: {
                                ...state.stories[storyId],
                                path: state.stories[storyId].path.slice(0, -1),
                            },
                        },
                    };
                });

                return poppedEdge;
            },

            recordCurrentAction: (action) => {
                const storyId = get().currentStoryId;
                if (!storyId) return;

                set((state) => {
                    const story = state.stories[storyId] || generateDefaultStoryState();
                    const history = story.history || { entries: [], pagesVisited: [] };
                    const pagesVisited =
                        action.type === "page_visit" &&
                        action.page_id !== undefined &&
                        !history.pagesVisited.includes(action.page_id)
                            ? [...history.pagesVisited, action.page_id]
                            : history.pagesVisited;

                    return {
                        stories: {
                            ...state.stories,
                            [storyId]: {
                                ...story,
                                history: {
                                    entries: [...history.entries, action],
                                    pagesVisited,
                                },
                            },
                        },
                    };
                });
            },
        }),
        {
            name: 'mlviz-app-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ stories: state.stories }),
        }
    )
);

export const useConfig = () => useAppStore(useShallow((state) => ({ config: state.config, loading: state.loading, error: state.error })));

export const useConfigActions = () => useAppStore(useShallow((state) => ({ fetchConfig: state.fetchConfig })));

export const useDataset = () => useAppStore(useShallow((state) => ({ activeDataset: state.activeDataset, setDataset: state.setDataset, clearDataset: state.clearDataset })))

export const useStory = (storyId: string) => {
    return useAppStore((state) => state.stories[storyId] || generateDefaultStoryState());
}

export const useCurrentStory = () => {
    const currentStoryId = useAppStore((state) => state.currentStoryId);
    const stories = useAppStore(useShallow((state) => state.stories));

    const story = currentStoryId ? stories[currentStoryId] : undefined;

    return {
        storyId: currentStoryId,
        storyState: story || DEFAULT_STORY_STATE,
        addEdge: useAppStore.getState().addCurrentEdge,
        popPath: useAppStore.getState().popCurrentPath,
        updateParams: useAppStore.getState().updateCurrentParams,
        recordAction: useAppStore.getState().recordCurrentAction,
    };
}

export const useCurrentStoryActions = () => {
    // Separate hook for actions to avoid unnecessary re-renders on storyState changes
    return useAppStore(
        useShallow((state) => ({
            setCurrentStoryId: state.setCurrentStoryId,
            updateCurrentStoryState: state.updateCurrentStoryState,
            updateCurrentParams: state.updateCurrentParams,
            resetCurrentStoryState: state.resetCurrentStoryState,
            addCurrentEdge: state.addCurrentEdge,
            popCurrentPath: state.popCurrentPath,
            recordCurrentAction: state.recordCurrentAction,
        })),
    );
}
