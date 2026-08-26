import { Button } from "@/components/ui/button";
import { StoryPage } from "@/pages/StoryPage";
import { useCurrentStoryActions, useAppStore } from "@/store/useAppStore";
import { useShallow } from "zustand/react/shallow";
import type { PageUnion, Story } from "@/types/story";
import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

const StoryPageWrapper: React.FC = () => {
    const { storyName } = useParams<{ storyName: string }>();
    const location = useLocation();
    const setCurrentStoryId = useCurrentStoryActions().setCurrentStoryId;

    useEffect(() => {
        if (storyName) {
            setCurrentStoryId(storyName);
        }
        // On unmount, clear the current story
        return () => {
            setCurrentStoryId("");
        };
    }, [storyName, setCurrentStoryId]);

    if (!storyName) throw new Error("No story name");

    // Use useConfig to get config and loading state
    const { config, loading, error } = useAppStore(useShallow((state) => ({
        config: state.config,
        loading: state.loading,
        error: state.error,
    })));

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="animate-pulse text-2xl font-mono text-fuchsia-600">
                    Loading story...
                </div>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="text-2xl font-mono text-red-600 mb-4">
                    Error loading config
                </div>
                <div className="text-sm font-mono text-gray-600 mb-8">
                    {error || "Config not found"}
                </div>
                <Button
                    onClick={() => {
                        window.location.href = "/";
                    }}
                    className="bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-full px-6"
                >
                    Return to Home (Default Config)
                </Button>
            </div>
        );
    }

    const stories: Record<string, Story> = config.stories;
    const pages: Record<string, PageUnion> = config.pages;

    const story: Story | undefined = storyName ? stories[storyName] : undefined;

    if (!story) {
        return <div>Story not found</div>;
    }

    const initialPageId = location.state?.local_index ?? story.start_page;
    
    // The key is important to force a remount when the story or page changes
    const pageKey = `${storyName}-${initialPageId}`;

    return (
        <StoryPage
            key={pageKey}
            story={story}
            pages={pages}
            initialPageId={initialPageId}
        />
    );
};

export default StoryPageWrapper;
