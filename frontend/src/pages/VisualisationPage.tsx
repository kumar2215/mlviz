import NavigationBar from "@/components/navigation/NavigationBar";
import DynamicPage from "@/pages/DynamicPage";
import StaticPage from "@/pages/StaticPage";
import { Button } from "@/components/ui/button";
import { Sidenote } from "@/components/Sidenote";
import { useVisualisation } from "@/store/useVisualisation";
import useUserMode from "@/hooks/useUserMode";
import { useMemo, useCallback, useId } from "react";
import { Link } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import usePathwaySession from "@/hooks/usePathwaySession";
import { pathwayHistorySource } from "@/store/pathwayHistorySource";
import { usePathway } from "@/store/usePathway";
import { useShallow } from "zustand/react/shallow";
import { useProgress, progressStore } from "@/store/useProgress";
import { activeBucket } from "@/store/progressStore";
import { pathwayStore } from "@/store/usePathway";
import { useConfig } from "@/store/useConfig";
import { pageTasks, taskKey } from "@/lib/storyProgress";
import { createTaskCompletion } from "@/lib/taskCompletion";
import PageLoading from "@/components/layout/PageLoading";

export default function VisualisationPage() {
    const { userMode } = useUserMode();
    const owner = useProgress(state => state.owner);
    const remoteReady = useProgress(state => state.remoteReady);
    return userMode === "story" && owner && !remoteReady ? <PageLoading label="Restoring story progress…" /> : <PathwaySession />;
}

function PathwaySession() {
    const { userMode, item } = useUserMode();
    const historySource = useMemo(() => pathwayHistorySource(userMode), [userMode]);
    const instanceId = useId();
    const epoch = useProgress(state => state.epoch);
    const sessionId = `${userMode}:${item.name}:${instanceId}:${userMode === "story" ? epoch : "lab"}`;
    const ready = usePathwaySession(sessionId, item, historySource, userMode === "story" ? item.name : undefined);
    return ready ? <VisualisationContent /> : null;
}

function VisualisationContent() {
    const { userMode, item } = useUserMode();
    const visualisation = useVisualisation(state => state.currentVisualisation);

    const inStoryMode = userMode === "story";
    const { pages, currentPageId, subpageIndex, replayKey, sessionId, markReady, completePage } = usePathway(useShallow(state => ({
        pages: state.pages, currentPageId: state.currentPageId, subpageIndex: state.subpageIndex,
        replayKey: state.replayKey, sessionId: state.sessionId, markReady: state.markSubpageReady,
        completePage: state.completePage,
    })));
    const currentPage = pages[currentPageId];
    const epoch = useProgress(state => state.epoch);
    const catalog = useConfig(state => state.resolvedStories);
    const perLevel = useConfig(state => state.config?.xp_per_level ?? 100);
    const onTaskComplete = useMemo(() => inStoryMode ? createTaskCompletion(pathwayStore, progressStore, item,
        { pageId: currentPageId, subpageIndex, sessionId, replayKey }, epoch, catalog, perLevel) : undefined,
        [inStoryMode, item, currentPageId, subpageIndex, sessionId, replayKey, epoch, catalog, perLevel]);
    const completedTasks = useMemo(() => {
        const attempt = pathwayStore.getState();
        if (attempt.sessionId !== sessionId || attempt.replayKey !== replayKey) return [];
        if (!inStoryMode || !currentPage?.id || !attempt.resumeTasks) return [];
        const saved = activeBucket(progressStore.getState()).stories[item.name];
        return pageTasks(currentPage).filter(task => saved?.milestones.includes(taskKey(currentPage.id!, task.id))).map(task => task.id);
    }, [inStoryMode, currentPage, item.name, sessionId, replayKey]);
    const markSubpageReady = useCallback(() => {
        markReady(currentPageId, subpageIndex, sessionId ?? undefined, replayKey);
    }, [currentPageId, subpageIndex, sessionId, replayKey, markReady]);
    const onComplete = useCallback(() => {
        completePage({ pageId: currentPageId, subpageIndex, sessionId, replayKey });
    }, [currentPageId, subpageIndex, sessionId, replayKey, completePage]);

    if (!pages || pages.length === 0) {
        return (
            <div className="flex h-screen w-screen flex-col bg-slate-50">
                <AppHeader />
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Coming soon</p>
                    <h1 className="!text-3xl text-slate-900">{item.display_name}</h1>
                    <p className="text-slate-500">{`${inStoryMode ? "This story" : "This visualisation"} is under construction. Explore the other activities while it takes shape.`}</p>
                    <Button asChild><Link to={inStoryMode ? "/stories" : "/"}>Explore other activities</Link></Button>
                </div>
            </div>
        );
    }

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
                onComplete={onComplete}
                onTaskComplete={onTaskComplete}
                completedTasks={completedTasks}
            />;
        } else if (currentPage.page_type === "mixed") {
            const { static_page, dynamic_page } = currentPage;
            if (dynamic_page.page_type !== "dynamic") {
                throw new Error("Mixed page reference was not resolved");
            }
            const category = inStoryMode ? dynamic_page.category : visualisation?.category;
            const name = inStoryMode ? dynamic_page.path : visualisation?.name;

            return (
                <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-page">
                    {!inStoryMode && <StaticPage {...static_page} compact />}
                    <div className="min-h-0 flex-1 overflow-hidden">
                        <DynamicPage
                            page={dynamic_page}
                            narration={inStoryMode ? static_page : undefined}
                            category={category!}
                            visualisation={name!}
                            subpageIndex={subpageIndex}
                            replayKey={replayKey}
                            onSubpageReady={markSubpageReady}
                            onComplete={onComplete}
                            onTaskComplete={onTaskComplete}
                            completedTasks={completedTasks}
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
            <AppHeader />
            <div className="min-h-0 flex-1 flex flex-row justify-between bg-page overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                    {renderPage()}
                </div>
                <aside aria-label="Story and activity navigation" className="shrink-0 w-60 flex flex-col min-h-0 items-center overflow-hidden bg-slate-50 border-l border-blue-100">
                    <NavigationBar />
                    {currentPage?.note && <Sidenote note={currentPage.note} />}
                </aside>
            </div>
        </div>
    );
};
