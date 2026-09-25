import { useStory, setCurrentStory } from "@/store/useStory";
import { useConfig } from "@/store/useConfig";
import { useVisualisation, setCurrentVisualisation } from "@/store/useVisualisation";
import ListPage, { type ListItem } from "./pages/ListPage";
import StoryPageWrapper from "@/pages/StoryPageWrapper";
import VisualisationPage from "@/pages/VisualisationPage";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import type Story from "@/types/story";
import type Visualisation from "@/types/visualisation";

type BlockReason = "mobile" | "narrow" | null;

const isMobileBrowser = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(
    navigator.userAgent,
);

function getBlockReason(): BlockReason {
    if (isMobileBrowser) return "mobile";
    if (window.innerWidth < 768) return "narrow";
    return null;
}

function MobileBlockScreen({ reason }: { reason: BlockReason }) {
    const isMobile = reason === "mobile";
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-white px-8 text-center gap-6">
            <div className="text-4xl">{isMobile ? "📱" : "↔️"}</div>
            <h1 className="text-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent font-semibold font-mono tracking-tight">
                {isMobile ? "Desktop Only" : "Window Too Narrow"}
            </h1>
            <p className="text-gray-500 max-w-sm">
                {isMobile
                    ? "This application is designed for desktop use. Please open it on a larger screen."
                    : "Please resize your browser window wider to use this application."}
            </p>
        </div>
    );
}

export default function App() {
    const blockReason = getBlockReason();

    const { loading, error, config, fetchConfig } = useConfig();
    const { visualisations } = useVisualisation();
    const { stories } = useStory();

    const [item, setItem] = useState<ListItem[] | Story | Visualisation | null>(null);
    const [itemName, setItemName] = useState<string>("");
    const [invalidPath, setInvalidPath] = useState<boolean>(false);
    const location = useLocation();
    const pathname = location.pathname;
    const category = pathname.startsWith("/category/") ? pathname.slice("/category/".length).replace("/", "") : undefined;
    const storyName = pathname.startsWith("/story/") ? pathname.slice("/story/".length).replace("/", "") : undefined;
    const visualisationName = pathname.startsWith("/viz/") ? pathname.slice("/viz/".length).replace("/", "") : undefined;

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    useEffect(() => {
        setInvalidPath(false);
        if (pathname === "/") {
            setItem(config?.categories.map((c) => ({ display_name: c.name, path: `/category/${c.config_path}`, icon: c.icon})) || null);
            setItemName("config");
        } else if (pathname.startsWith("/category/")) {
            setItem(Object.values(visualisations).filter((v) => v.category === category).map((v) => ({ display_name: v.display_name, path: `/viz/${v.name}` })) || null);
            setItemName("visualisations");
        } else if (pathname.startsWith("/stories")) {
            setItem(Object.values(stories).map((s) => ({ display_name: s.display_name, path: `/story/${s.name}` })) || null);
            setItemName("stories");
        } else if (pathname.startsWith("/story/")) {
            const story = stories[storyName!];
            setItem(story);
            setItemName("story");
            setCurrentStory(story);
            setCurrentVisualisation(null);
        } else if (pathname.startsWith("/viz/")) {
            const visualisation = visualisations[visualisationName!];
            setItem(visualisation);
            setItemName("visualisation");
            setCurrentVisualisation(visualisation);
            setCurrentStory(null);
        } else {
            setInvalidPath(true);
        }
    }, [pathname, category, storyName, visualisationName, config, visualisations, stories]);

    if (blockReason) {
        return <MobileBlockScreen reason={blockReason} />;
    }

    if (invalidPath) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="text-4xl font-bold font-mono text-red-600 mb-4">
                    {`Invalid path: ${pathname}`}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="animate-pulse text-2xl font-mono text-fuchsia-600">
                    {`Loading ${itemName}...`}
                </div>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="text-4xl font-bold font-mono text-red-600 mb-4">
                    {`Error loading ${itemName}`}
                </div>
                <div className="text-sm font-mono text-gray-600 mb-8">
                    {error || `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} not found`}
                </div>
            </div>
        );
    }

    if (Array.isArray(item)) {
        return <ListPage listItems={item} />;
    } else if (itemName === "story") {
        return <StoryPageWrapper key={`story:${item.name}`} story={item} />;
    } else if (itemName === "visualisation") {
        return <VisualisationPage key={`viz:${item.name}`} />;
    }
};
