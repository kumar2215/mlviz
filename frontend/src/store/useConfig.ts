import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useVisualisation } from "@/store/useVisualisation";
import { useStory } from "@/store/useStory";
import type Config from "@/types/config";
import type Story from "@/types/story";
import { unrollStory } from "@/utils/storyReferences";
import { validateStoryProgressConfig } from "@/lib/storyProgress";

type ConfigStore = {
    config: Config | null;
    resolvedStories: Record<string, Story>;
    loading: boolean;
    error: string | null;
    fetchConfig: () => Promise<void>;
};

export const useConfig = create<ConfigStore>()(
    immer((set) => ({
        config: null,
        resolvedStories: {},
        loading: false,
        error: null,
        fetchConfig: async () => {
            set({ loading: true, error: null });
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const configParam =
                    urlParams.get("config") || import.meta.env.VITE_CONFIG_FILE || "config";
                const configPath = configParam.includes("/")
                    ? configParam
                    : `config/${configParam}.json`;

                const response = await fetch(`${import.meta.env.BASE_URL}${configPath}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch config: ${response.statusText}`);
                }

                const config = (await response.json()) as Config;
                if (config.xp_per_level !== undefined && (!Number.isSafeInteger(config.xp_per_level) || config.xp_per_level < 1)) throw new Error("xp_per_level must be a positive integer");
                set({ config });

                await Promise.all(
                    config.categories.map(async (category) => {
                        await useVisualisation.getState().fetchVisualisations(category.config_path);
                    }),
                );
                await Promise.all(
                    config.stories.map(async (storyName) => {
                        await useStory.getState().fetchStory(storyName);
                    }),
                );
                const catalog = { stories: useStory.getState().stories, visualisations: useVisualisation.getState().visualisations };
                const resolvedStories = Object.fromEntries(config.stories.map(name => {
                    const story = unrollStory(catalog.stories[name], catalog);
                    validateStoryProgressConfig(story);
                    return [name, story];
                }));
                set({ loading: false, resolvedStories });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error("Error loading config:", err);
                set({ error: message, loading: false });
            }
        },
    })),
);
