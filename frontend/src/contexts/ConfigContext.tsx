import type { Config } from "@/types/story";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

interface ConfigContextType {
    config: Config | null;
    loading: boolean;
    error: string | null;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                setLoading(true);
                const urlParams = new URLSearchParams(window.location.search);
                const configParam = urlParams.get("config") || 
                                   import.meta.env.VITE_CONFIG_FILE || 
                                   "config";
                
                // If the path doesn't contain a slash, assume it's in the config/ folder
                const configPath = configParam.includes("/") ? configParam : `config/${configParam}.json`;
                
                // Fetch from public folder
                const response = await fetch(`${import.meta.env.BASE_URL}${configPath}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch config: ${response.statusText}`);
                }
                const data = await response.json();
                setConfig(data as Config);
            } catch (err) {
                console.error("Error loading config:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    return (
        <ConfigContext.Provider value={{ config, loading, error }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error("useConfig must be used within a ConfigProvider");
    }
    return context;
}
