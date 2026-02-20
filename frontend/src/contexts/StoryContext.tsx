import type { EdgeNode, Parameters } from "@/types/story";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

interface StoryState {
    path: EdgeNode[];
    params: Record<string, Parameters>;
}

const generateDefaultStoryState = () => {
    return {
        path: [],
        params: {},
    };
};

interface StoryContextType {
    getStoryState: (storyId: string) => StoryState;
    updateStoryState: (storyId: string, updates: Partial<StoryState>) => void;
    resetStoryState: (storyId: string) => void;
    addEdge: (storyId: string, edge: EdgeNode) => void;
    popPath: (storyId: string) => EdgeNode | undefined;
}

export const StoryContext = createContext<StoryContextType | null>(null);

interface CurrentStoryContextType {
    storyId: string;
    storyState: StoryState;
    updateStoryState: (updates: Partial<StoryState>) => void;
    updateParams: (paramUpdates: Record<string, any>) => void;
    resetStoryState: () => void;
    addEdge: (edge: EdgeNode) => void;
    popPath: () => EdgeNode | undefined;
}

export const CurrentStoryContext =
    createContext<CurrentStoryContextType | null>(null);

const LOCAL_STORAGE_STORY_KEY = "storyStates";

export function StoryProvider({ children }: { children: ReactNode }) {
    const [stories, setStories] = useState<Record<string, StoryState>>({});

    useEffect(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_STORY_KEY);
        if (saved) {
            setStories(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_STORY_KEY, JSON.stringify(stories));
    }, [stories]);

    const getStoryState = (storyId: string): StoryState => {
        return stories[storyId] || generateDefaultStoryState();
    };

    const updateStoryState = (
        storyId: string,
        updates: Partial<StoryState>
    ) => {
        setStories((prev) => {
            const currentState = prev[storyId] || generateDefaultStoryState();
            return {
                ...prev,
                [storyId]: { ...currentState, ...updates },
            };
        });
    };

    const addEdge = (storyId: string, edge: EdgeNode) => {
        console.log('[StoryContext] addEdge called:', { storyId, edge, stackTrace: new Error().stack });
        setStories((prev) => {
            const currentState = prev[storyId] || generateDefaultStoryState();
            const currentPath = Array.isArray(currentState.path) ? currentState.path : [];
            console.log('[StoryContext] addEdge - before:', { currentPath, newEdge: edge });
            
            // Prevent duplicate consecutive edges (React Strict Mode can cause double calls)
            const lastEdge = currentPath[currentPath.length - 1];
            if (lastEdge && lastEdge.local_index === edge.local_index && lastEdge.story_name === edge.story_name) {
                console.log('[StoryContext] Skipping duplicate edge');
                return prev;
            }
            
            return {
                ...prev,
                [storyId]: {
                    ...currentState,
                    path: [...currentPath, edge],
                },
            };
        });
    };

    const popPath = (storyId: string): EdgeNode | undefined => {
        // Read current state synchronously first
        const currentState = stories[storyId] || generateDefaultStoryState();
        const currentPath = Array.isArray(currentState.path) ? currentState.path : [];
        
        if (currentPath.length === 0) {
            console.log('[StoryContext] popPath - path is empty');
            return undefined;
        }
        
        const poppedEdge = currentPath[currentPath.length - 1];
        console.log('[StoryContext] popPath - popping:', poppedEdge);
        
        // Update state
        setStories((prev) => {
            const currentState = prev[storyId] || generateDefaultStoryState();
            const currentPath = Array.isArray(currentState.path) ? currentState.path : [];
            
            if (currentPath.length === 0) {
                return prev;
            }
            
            const newPath = currentPath.slice(0, -1);
            
            return {
                ...prev,
                [storyId]: {
                    ...currentState,
                    path: newPath,
                },
            };
        });
        
        return poppedEdge;
    };

    const resetStoryState = (storyId: string) => {
        setStories((prev) => ({
            ...prev,
            [storyId]: generateDefaultStoryState(),
        }));
    };

    return (
        <StoryContext.Provider
            value={{
                getStoryState,
                updateStoryState,
                resetStoryState,
                addEdge,
                popPath,
            }}
        >
            {children}
        </StoryContext.Provider>
    );
}

export function CurrentStoryProvider({
    storyId,
    children,
}: {
    storyId: string;
    children: ReactNode;
}) {
    const globalContext = useContext(StoryContext);

    if (!globalContext) {
        throw new Error(
            "CurrentStoryProvider must be used within StoryProvider"
        );
    }

    const storyState = globalContext.getStoryState(storyId);

    const updateParams = (paramUpdates: Record<string, any>) => {
        const currentParams = storyState.params || {};
        globalContext.updateStoryState(storyId, {
            params: { ...currentParams, ...paramUpdates },
        });
    };

    const currentStoryValue: CurrentStoryContextType = {
        storyId,
        storyState,
        updateStoryState: (updates) =>
            globalContext.updateStoryState(storyId, updates),
        updateParams,
        resetStoryState: () => globalContext.resetStoryState(storyId),
        addEdge: (edge) => globalContext.addEdge(storyId, edge),
        popPath: () => globalContext.popPath(storyId),
    };

    return (
        <CurrentStoryContext.Provider value={currentStoryValue}>
            {children}
        </CurrentStoryContext.Provider>
    );
}

export function useStoryContext() {
    const context = useContext(StoryContext);
    if (!context) {
        throw new Error("useStoryContext must be used within StoryProvider");
    }
    return context;
}

export function useCurrentStory() {
    const context = useContext(CurrentStoryContext);
    if (!context) {
        throw new Error(
            "useCurrentStory must be used within CurrentStoryProvider"
        );
    }
    return context;
}
