import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useVisualisation } from '@/store/useVisualisation';
import { useStory } from "@/store/useStory";
import type Config from '@/types/config';

type ConfigStore = {
    config: Config | null;
    loading: boolean;
    error: string | null;
    fetchConfig: () => Promise<void>;
};

export const useConfig = create<ConfigStore>()(
    immer((set) => ({
        config: null,
        loading: false,
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

                const config = await response.json() as Config;
                set({ config });

                await Promise.all(
                    config.categories.map(async (category) => {
                        await useVisualisation.getState().fetchVisualisations(category.config_path);
                    })
                );
                await useStory.getState().fetchStories();
                set({ loading: false });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error("Error loading config:", err);
                set({ error: message, loading: false });
            }
        },
    }))
);
