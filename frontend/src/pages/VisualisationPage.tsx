import NavigationBar from "@/components/navigation/NavigationBar";
import DynamicPage from "@/pages/DynamicPage";
import StaticPage from "@/pages/StaticPage";
import { Button } from "@/components/ui/button";
import { Sidenote } from "@/components/Sidenote";
import { getCurrentVisualisation } from "@/store/useVisualisation";
import { useVisualisation } from "@/store/useVisualisation";
import type { PageUnion } from "@/types/page";
import type { Transition } from "@/types/visualisation";
import { House } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function VisualisationPage() {
    const visualisation = getCurrentVisualisation();
    if (!visualisation) throw new Error("No visualisation selected");

    const { currentVisualisationHistory, addPageVisit, getPreviousPageId, recordAction } = useVisualisation();
    const path = currentVisualisationHistory.path;
    const pages = visualisation.pages;
    const transitions = visualisation.transitions;

    if (!pages || pages.length === 0) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="text-2xl font-mono text-fuchsia-600">
                    {`Visualisation "${visualisation.name}" is under construction.`}
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
            return <DynamicPage page={currentPage} />;
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
                    visualisation/{visualisation.name} [page {currentPageId}]
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
