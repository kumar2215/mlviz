import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type Config from '@/types/config';

type ConfigStore = {
    config: Config | null;
    loading: boolean;
    error: string | null;
    fetchConfig: () => Promise<void>;
};

export const useConfig = create<ConfigStore>()(
    persist(
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

                    const data = await response.json();
                    set({ config: data as Config, loading: false });
                } catch (err) {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    console.error("Error loading config:", err);
                    set({ error: message, loading: false });
                }
            },
        })),
        {
            name: 'mlviz-config-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
