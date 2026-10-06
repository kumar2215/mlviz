import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type Story from "@/types/story";
import type { HistoryEntry, StoryHistoryState } from "@/types/history";

interface StoryStore {
    currentStory: Story | null;
    currentStoryHistory: StoryHistoryState;
    stories: Record<string, Story>;
    loading: boolean;
    error: string | null;
    fetchStory: (storyName: string) => Promise<void>;
    addPageVisit: (pageId: number) => void;
    getPreviousPageId: () => number | undefined;
    recordAction: (action: HistoryEntry) => void;
    updateParams: (paramUpdates: Record<string, any>) => void;
}

export const useStory = create<StoryStore>()(
    immer((set, get) => ({
        currentStory: null,
        currentStoryHistory: {
            story_id: "",
            params: {},
            entries: [],
            path: [],
        },
        stories: {},
        loading: false,
        error: null,
        fetchStory: async (storyName: string) => {
            if (get().stories[storyName]) return; // Already loaded
            set((state) => {
                state.loading = true;
                state.error = null;
            });
            try {
                const filePath = `config/story/${storyName}.json`;
                const response = await fetch(
                    `${import.meta.env.BASE_URL}${filePath}`,
                );
                if (!response.ok) {
                    throw new Error(`Failed to fetch story file: ${filePath}, status: ${response.statusText}`);
                }
                const data = await response.json();
                const story = { ...data, name: storyName } as Story;
                set((state) => {
                    state.stories[storyName] = story;
                    state.loading = false;
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error("Error loading story:", err);
                set((state) => {
                    state.error = message;
                    state.loading = false;
                });
                throw err;
            }
        },
        addPageVisit: (pageId: number) => {
            set((state) => {
                state.recordAction({
                    actionType: "page_visit",
                    timestamp: Date.now(),
                    page_id: pageId,
                });
                state.currentStoryHistory.path.push(pageId);
            });
        },
        getPreviousPageId: () => {
            const path = get().currentStoryHistory.path;
            if (path.length === 0) return undefined;
            const lastPageId = path[path.length - 1];
            set((state) => {
                state.currentStoryHistory.path.pop();
            });
            return lastPageId;
        },
        recordAction: (action: HistoryEntry) => {
            set((state) => {
                state.currentStoryHistory.entries.push(action);
            });
        },
        updateParams: (paramUpdates: Record<string, any>) => {
            set((state) => {
                const currentParams = state.currentStoryHistory.params;
                state.currentStoryHistory.params = { ...currentParams, ...paramUpdates };
            });
        },
    })),
);

export function setCurrentStory(story: Story | null): void {
    useStory.setState((state) => {
        if (story) state.stories[story.name] = story;  // To prevent multiple unrolls of the same story
        state.currentStory = story;
        state.currentStoryHistory = {
            story_id: story?.name || "",
            params: {},
            entries: [],
            path: [],
        };
    });
}
