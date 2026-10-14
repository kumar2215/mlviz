import NavigationBar from "@/components/navigation/NavigationBar";
import DynamicPage from "@/pages/DynamicPage";
import StaticPage from "@/pages/StaticPage";
import { Button } from "@/components/ui/button";
import { Sidenote } from "@/components/Sidenote";
import { useVisualisation } from "@/store/useVisualisation";
import { useStory } from "@/store/useStory";
import useUserMode from "@/hooks/useUserMode";
import type { PageUnion } from "@/types/page";
import type { Transition } from "@/types/story";
import { House } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

export default function VisualisationPage() {
    const { userMode, item, hook: useModeStore } = useUserMode();
    const currentStoryHistory = useStory(state => state.currentStoryHistory);
    const currentVisualisationHistory = useVisualisation(state => state.currentVisualisationHistory);
    const visualisation = useVisualisation(state => state.currentVisualisation);

    const inStoryMode = userMode === "story";
    const addPageVisit = useModeStore(state => state.addPageVisit);
    const getPreviousPageId = useModeStore(state => state.getPreviousPageId);
    const recordAction = useModeStore(state => state.recordAction);
    const currentHistory = inStoryMode ? currentStoryHistory : currentVisualisationHistory;
    const path = currentHistory!.path;
    const pages = item.pages;
    const transitions = item.transitions;
    const name = item.name;

    const [currentPageId, setCurrentPageId] = useState(0);
    const [subpageIndex, setSubpageIndex] = useState(0);
    const [readySubpages, setReadySubpages] = useState<Record<number, boolean>>({});
    const [replayKey, setReplayKey] = useState(0);
    const currentPage: PageUnion = pages[currentPageId];
    const activeDynamicPage = currentPage?.page_type === "mixed" && currentPage.dynamic_page.page_type === "dynamic" ? currentPage.dynamic_page : currentPage?.page_type === "dynamic" ? currentPage : null;
    const pageCompleted = Boolean(activeDynamicPage?.completion_button_id && currentHistory?.entries.some(
        entry => entry.actionType === "button_click" && entry.button_id === activeDynamicPage.completion_button_id,
    ));
    const subpages = activeDynamicPage?.subpages ?? [];
    const isLastSubpage = subpages.length === 0 || subpageIndex === subpages.length - 1;
    const markSubpageReady = useCallback(() => {
        setReadySubpages(previous => previous[subpageIndex] ? previous : { ...previous, [subpageIndex]: true });
    }, [subpageIndex]);

    useEffect(() => {
        recordAction({
            actionType: "page_visit",
            timestamp: Date.now(),
            page_id: currentPageId,
        });
    }, [currentPageId, recordAction]);

    if (!pages || pages.length === 0) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
                <div className="text-2xl font-mono text-fuchsia-600">
                    {`${inStoryMode ? "Story" : "Visualisation"} '${name}' is under construction.`}
                </div>
            </div>
        );
    }

    const getAvailableTransitions = (): Transition[] => {
        return (isLastSubpage ? transitions : []).filter(
            (transition) => transition.from === currentPageId,
        );
    };

    const handleNavigate = (pageId: number) => {
        addPageVisit(currentPageId);
        setCurrentPageId(pageId);
        setSubpageIndex(0);
        setReadySubpages({});
        setReplayKey(value => value + 1);
    };

    const handleBack = () => {
        if (subpageIndex > 0) {
            setSubpageIndex(value => value - 1);
            return;
        }
        const previousPageId = getPreviousPageId();
        if (previousPageId !== undefined) {
            setCurrentPageId(previousPageId);
            setSubpageIndex(0);
            setReadySubpages({});
            setReplayKey(value => value + 1);
        }
    };

    const canGoBack = path.length > 0 || subpageIndex > 0;

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
            const category = inStoryMode ? currentPage.category : visualisation?.category;
            const name = inStoryMode ? currentPage.path : visualisation?.name;

            return <DynamicPage
                page={currentPage}
                category={category!}
                visualisation={name!}
                subpageIndex={subpageIndex}
                replayKey={replayKey}
                onSubpageReady={markSubpageReady}
            />;
        } else if (currentPage.page_type === "mixed") {
            const { static_page, dynamic_page } = currentPage;
            if (dynamic_page.page_type !== "dynamic") {
                throw new Error("Mixed page reference was not resolved");
            }
            const category = inStoryMode ? dynamic_page.category : visualisation?.category;
            const name = inStoryMode ? dynamic_page.path : visualisation?.name;

            return (
                <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
                    <StaticPage {...static_page} compact />
                    <div className="min-h-0 flex-1 overflow-hidden">
                        <DynamicPage
                            page={dynamic_page}
                            category={category!}
                            visualisation={name!}
                            subpageIndex={subpageIndex}
                            replayKey={replayKey}
                            onSubpageReady={markSubpageReady}
                        />
                    </div>
                </div>
            );
        } else {
            throw new Error(`Unknown page type: ${currentPage.page_type}`);
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
                        currentHistory={currentHistory}
                        subpage={subpages.length > 0 ? {
                            index: subpageIndex,
                            labels: subpages,
                            canAdvance: Boolean(readySubpages[subpageIndex]) || pageCompleted,
                            onNext: () => setSubpageIndex(value => value + 1),
                            onReplay: () => {
                                setSubpageIndex(0);
                                setReadySubpages({});
                                setReplayKey(value => value + 1);
                            },
                        } : undefined}
                    />
                    {currentPage?.note && <Sidenote note={currentPage.note} />}
                </div>
            </div>

            <footer className="shrink-0 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm tracking-tight">
                <p className="bg-gradient-to-r text-xs from-fuchsia-700 to-cyan-700 bg-clip-text text-transparent font-semibold font-mono">
                    {inStoryMode ? "Story" : "Visualisation"}/{name} [page {currentPageId}]{subpages.length > 0 ? ` [step ${subpageIndex + 1}/${subpages.length}]` : ""}
                </p>
                <Link to={"/"}>
                    <Button
                        className="bg-gradient-to-br from-fuchsia-500 to-purple-500 hover:from-blue-700 hover:to-purple-700 transition-all duration-100 hover:shadow-2xl size-8"
                        size="icon"
                    >
                        <House />
                    </Button>
                </Link>
            </footer>
        </div>
    );
};
