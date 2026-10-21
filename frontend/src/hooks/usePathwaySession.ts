import { useLayoutEffect } from "react";
import { pathwayStore, usePathway } from "@/store/usePathway";
import { transitionAvailable, type PathwayDefinition, type PathwayHistorySource } from "@/store/pathwayStore";
import { progressStore } from "@/store/useProgress";
import { activeBucket } from "@/store/progressStore";
import { stepIds, stepKey } from "@/lib/storyProgress";

export default function usePathwaySession(sessionId: string, { pages, transitions }: PathwayDefinition, source: PathwayHistorySource, storyId?: string) {
    const ready = usePathway(state => state.sessionId === sessionId);
    useLayoutEffect(() => {
        if (storyId && pathwayStore.getState().sessionId !== sessionId) source.reset?.();
        pathwayStore.getState().openSession(sessionId, { pages, transitions }, source);
        const snapshot = storyId ? activeBucket(progressStore.getState()).stories[storyId] : undefined;
        if (snapshot) pathwayStore.getState().restoreProgress(snapshot);
        const epoch = progressStore.getState().epoch;
        let mergingRemote = false;
        const save = () => {
            if (!storyId || mergingRemote) return;
            const state = pathwayStore.getState();
            if (state.sessionId !== sessionId) return;
            const page = state.pages[state.currentPageId];
            if (!page?.id) return;
            const milestones = state.pages.flatMap((entry, index) => !entry.id ? [] : [
                ...(state.visitedPages.has(index) ? [`visit:${entry.id}`] : []),
                ...(state.savedUnlocked.has(index) || state.transitions.some(transition => transition.to === index && transitionAvailable(state, transition)) ? [`unlock:${entry.id}`] : []),
                ...(state.restoredCompletedPages.has(index) || state.history.entries.some(action => action.actionType === "page_complete" && action.page_id === index) ? [`complete:${entry.id}`] : []),
                ...stepIds(entry).flatMap((step, stepIndex) => state.progressByPage[index]?.completed.includes(stepIndex) ? [stepKey(entry.id!, step)] : []),
            ]);
            progressStore.getState().update(storyId, milestones, page.id, stepIds(page)[state.subpageIndex] ?? "", epoch);
        };
        const stopSaving = pathwayStore.subscribe(save);
        const stopRemote = progressStore.subscribe((state, previous) => {
            if (!storyId || state.epoch !== epoch || pathwayStore.getState().sessionId !== sessionId) return;
            const value = activeBucket(state).stories[storyId];
            if (value && value !== activeBucket(previous).stories[storyId]) {
                mergingRemote = true;
                pathwayStore.getState().mergeSavedProgress(value);
                mergingRemote = false;
            }
        });
        const unsubscribe = source.subscribe(history => {
            if (pathwayStore.getState().sessionId === sessionId) pathwayStore.getState().syncHistory(history);
        });
        pathwayStore.getState().start();
        save();
        const interval = setInterval(() => {
            if (pathwayStore.getState().sessionId === sessionId) pathwayStore.getState().refreshTime();
        }, 250);
        return () => { unsubscribe(); stopSaving(); stopRemote(); clearInterval(interval); };
    }, [sessionId, pages, transitions, source, storyId]);
    return ready;
}
