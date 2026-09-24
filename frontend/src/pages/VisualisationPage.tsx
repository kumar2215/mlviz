import NavigationBar from "@/components/navigation/NavigationBar";
import DynamicPage from "@/pages/DynamicPage";
import StaticPage from "@/pages/StaticPage";
import { Button } from "@/components/ui/button";
import { Sidenote } from "@/components/Sidenote";
import { getCurrentVisualisation, setCurrentVisualisation, useVisualisation } from "@/store/useVisualisation";
import { getCurrentStory, useStory } from "@/store/useStory";
import type { PageUnion } from "@/types/page";
import type { Transition } from "@/types/visualisation";
import type Visualisation from "@/types/visualisation";
import type { Story } from "@/types/story";
import type { HistoryState } from "@/types/history";
import { House } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

export default function VisualisationPage() {
    const location = useLocation();
    const { visualisationName } = useParams<{ visualisationName: string }>();
    const userMode = location.pathname.includes("/story/") ? "story" 
        : location.pathname.includes("/viz/") ? "visualisation" 
        : null;
    
    if (!userMode) {
        throw new Error("No user mode selected");
    }

    let story: Story | undefined = undefined;
    let visualisation: Visualisation | undefined = undefined;
    let currentHistory: HistoryState | undefined = undefined;
    
    if (userMode === "visualisation") {
        const currentVisualisation = useVisualisation().visualisations[visualisationName!];
        if (!currentVisualisation) {
            throw new Error("No visualisation selected");
        }
        visualisation = currentVisualisation;
        if (getCurrentVisualisation()?.name !== visualisation.name) {
            setCurrentVisualisation(visualisation);
        }
        currentHistory = useVisualisation().currentVisualisationHistory;
    } else if (userMode === "story") {
        const currentStory = getCurrentStory();
        if (!currentStory) {
            throw new Error("No story selected");
        }
        story = currentStory;
        currentHistory = useStory().currentStoryHistory;
    }

    const { addPageVisit, getPreviousPageId, recordAction } = userMode === "story" ? useStory() : useVisualisation();
    const path = currentHistory!.path;
    const pages = (userMode === "story" ? story : visualisation)!.pages;
    const transitions = (userMode === "story" ? story : visualisation)!.transitions;
    const name = (userMode === "story" ? story : visualisation)!.name;

    if (!pages || pages.length === 0) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="text-2xl font-mono text-fuchsia-600">
                    {`${userMode === "story" ? "Story" : "Visualisation"} '${name}' is under construction.`}
                </div>
            </div>
        );
    }

    const [currentPageId, setCurrentPageId] = useState(0);
    const currentPage: PageUnion = pages[currentPageId];

    useEffect(() => {
        recordAction({
            actionType: "page_visit",
            timestamp: Date.now(),
            page_id: currentPageId,
        });
    }, []);

    const getAvailableTransitions = (): Transition[] => {
        return transitions.filter(
            (transition) => transition.from === currentPageId,
        );
    };

    const handleNavigate = (pageId: number) => {
        addPageVisit(currentPageId);
        setCurrentPageId(pageId);
    };

    const handleBack = () => {
        const previousPageId = getPreviousPageId();
        if (previousPageId !== undefined) {
            setCurrentPageId(previousPageId);
        }
    };

    const canGoBack = path.length > 0;

    const renderPage = () => {
        if (!currentPage) {
            return (
                <div className="p-4 text-center">
                    <h1 className="text-2xl font-bold">Page Not Found</h1>
                    <p>Page {currentPageId} does not exist.</p>
                </div>
            );
        }

        if (currentPage.page_type === "static") {
            return <StaticPage {...currentPage} />;
        } else if (currentPage.page_type === "dynamic") {
            const category = userMode === "story" ? currentPage.category : visualisation?.category;
            const name = userMode === "story" ? currentPage.path : visualisation?.name;

            return <DynamicPage
                page={currentPage}
                category={category!}
                visualisation={name!}
            />;
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-row justify-between bg-gray-200 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                    {renderPage()}
                </div>
                <div className="shrink-0 w-60 flex flex-col gap-2 items-center justify-between overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50 border-l border-gray-300">
                    <NavigationBar
                        transitions={getAvailableTransitions()}
                        handleNext={handleNavigate}
                        onBack={handleBack}
                        canGoBack={canGoBack}
                    />
                    {currentPage.note && <Sidenote note={currentPage.note} />}
                </div>
            </div>

            <footer className="shrink-0 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm tracking-tight">
                <p className="bg-gradient-to-r text-xs from-fuchsia-700 to-cyan-700 bg-clip-text text-transparent font-semibold font-mono">
                    {userMode === "story" ? "Story" : "Visualisation"}/{name} [page {currentPageId}]
                </p>
                <Link to={"/"}>
                    <Button
                        className="bg-gradient-to-br from-fuchsia-500 to-purple-500 text-gray-800 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-100 hover:shadow-2xl size-8"
                        size="icon"
                    >
                        <House />
                    </Button>
                </Link>
            </footer>
        </div>
    );
};
