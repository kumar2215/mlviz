import { createStore } from "zustand/vanilla";
import type { HistoryEntry, HistoryState } from "../types/history.ts";
import type { PageUnion, Parameters } from "../types/page.ts";
import type { Transition } from "../types/story.ts";
import { displayCondition, isConditionMet } from "../utils/conditions.ts";
import { stepIds, stepKey, type StoryProgress } from "../lib/storyProgress.ts";
import { pageTitle, getDynamicPage, layoutPathway, selectSubpage, subpageControls, transitionKey, type PathwayLayout, type SubpageProgress } from "../components/navigation/pathwayModel.ts";

export interface PathwayDefinition { pages: PageUnion[]; transitions: Transition[] }
export interface PageProgressContext {
    pageId: number;
    subpageIndex: number;
    sessionId: string | null;
    replayKey: number;
}
export interface PathwayHistorySource {
    reset?: () => void;
    getHistory: () => HistoryState;
    subscribe: (listener: (history: HistoryState) => void) => () => void;
    addPageVisit: (pageId: number) => void;
    recordAction: (entry: HistoryEntry) => void;
    now?: () => number;
}

export interface PathwayState extends PathwayDefinition {
    sessionId: string | null;
    layout: PathwayLayout;
    history: HistoryState;
    now: number;
    currentPageId: number;
    subpageIndex: number;
    replayKey: number;
    progressByPage: Record<number, SubpageProgress>;
    resumeTasks: boolean;
    visitedPages: ReadonlySet<number>;
    traversed: ReadonlySet<string>;
    savedUnlocked: ReadonlySet<number>;
    restoredCompletedPages: ReadonlySet<number>;
    restoreProgress: (progress: StoryProgress) => void;
    mergeSavedProgress: (progress: StoryProgress) => void;
    focusRequest: { pageId: number; serial: number } | null;
    setDefinition: (definition: PathwayDefinition) => void;
    openSession: (sessionId: string, definition: PathwayDefinition, source: PathwayHistorySource) => void;
    syncHistory: (history: HistoryState) => void;
    refreshTime: () => void;
    start: () => void;
    navigatePage: (pageId: number) => void;
    navigateSubpage: (pageId: number, index: number) => void;
    replayPage: (pageId: number) => void;
    markSubpageReady: (pageId: number, index: number, sessionId?: string, replayKey?: number) => void;
    completePage: (context: PageProgressContext) => void;
    moveFocus: (pageId: number, key: string) => void;
}

const emptyLabels: string[] = [];
export const pageSubpages = (state: PathwayState, pageId = state.currentPageId) => getDynamicPage(state.pages[pageId])?.subpages ?? emptyLabels;

export function canAdvanceSubpage(state: PathwayState): boolean {
    return Boolean(state.progressByPage[state.currentPageId]?.completed.includes(state.subpageIndex))
        || state.restoredCompletedPages.has(state.currentPageId)
        || state.history.entries.some(entry => entry.actionType === "page_complete" && entry.page_id === state.currentPageId);
}

export function canExitPage(state: PathwayState): boolean {
    const labels = pageSubpages(state);
    return labels.length === 0 || state.subpageIndex === labels.length - 1
        || subpageControls(labels.length, state.progressByPage[state.currentPageId], false).canReplay;
}

export function canReplayPage(state: PathwayState, pageId: number): boolean {
    const labels = pageSubpages(state, pageId);
    if (labels.length) return subpageControls(labels.length, state.progressByPage[pageId], false).canReplay;
    return state.restoredCompletedPages.has(pageId) || state.history.entries.some(entry => entry.actionType === "page_complete" && entry.page_id === pageId);
}

export function transitionAvailable(state: PathwayState, transition: Transition): boolean {
    return transition.from === state.currentPageId && (state.savedUnlocked.has(transition.to) || canExitPage(state) && isConditionMet(transition.condition,
        { ...state.history.params, __history: state.history, __now: state.now } as unknown as Record<string, Parameters>,
        { sourcePageId: transition.from }));
}

export function selectPathwayNode(state: PathwayState, pageId: number) {
    const active = pageId === state.currentPageId;
    const incoming = state.layout.edges.filter(edge => edge.to === pageId && edge.from === state.currentPageId);
    const status = active ? "current" : state.visitedPages.has(pageId) ? "visited" : state.savedUnlocked.has(pageId) || incoming.some(edge => transitionAvailable(state, edge.transition)) ? "available" : "locked";
    const reason = active ? "You are here" : status === "visited" ? "Visited · click to restart this page" : status === "available" ? "Available · click to continue" : incoming.length ? !canExitPage(state) ? "Finish the current page’s subpages to continue." : incoming.map(edge => edge.transition.condition.description || (edge.transition.condition.condition_type === "Button" ? "Complete the current activity to unlock this page." : displayCondition(edge.transition.condition))).join(" or ") : "Not available yet · follow the current pathway.";
    const progress = state.progressByPage[pageId];
    return {
        node: state.layout.nodes.find(node => node.id === pageId),
        state: status,
        title: pageTitle(state.pages[pageId], pageId),
        reason,
        labels: pageSubpages(state, pageId),
        progress,
        canAdvance: active ? canAdvanceSubpage(state) : Boolean(progress?.completed.includes(progress.index)),
        currentIndex: active ? state.subpageIndex : progress?.index ?? 0,
        canReplay: canReplayPage(state, pageId),
    };
}

export function createPathwayStore(definition: PathwayDefinition, initialSource: PathwayHistorySource) {
    let source = initialSource;
    const now = () => source.now?.() ?? Date.now();
    let started = false;
    return createStore<PathwayState>()((set, get) => {
        const freshState = () => ({ ...get(), history: source.getHistory(), now: now() });
        const recordArrival = (pageId: number) => {
            source.recordAction({ actionType: "page_visit", timestamp: now(), page_id: pageId });
            get().syncHistory(source.getHistory());
        };
        return {
            ...definition,
            sessionId: null,
            layout: layoutPathway(definition.pages, definition.transitions),
            history: source.getHistory(),
            now: now(),
            currentPageId: 0,
            subpageIndex: 0,
            replayKey: 0,
            resumeTasks: false,
            progressByPage: {},
            visitedPages: new Set([0]),
            traversed: new Set(),
            savedUnlocked: new Set(),
            restoredCompletedPages: new Set(),
            restoreProgress: progress => {
                const state = get();
                const has = (key: string) => progress.milestones.includes(key);
                const visited = state.pages.flatMap((page, index) => page.id && has(`visit:${page.id}`) ? [index] : []);
                const unlocked = state.pages.flatMap((page, index) => page.id && has(`unlock:${page.id}`) ? [index] : []);
                const completed = state.pages.flatMap((page, index) => page.id && has(`complete:${page.id}`) ? [index] : []);
                const checkpointPage = state.pages.findIndex(page => page.id === progress.checkpoint.page);
                const currentPageId = checkpointPage >= 0 && (visited.includes(checkpointPage) || unlocked.includes(checkpointPage)) ? checkpointPage : 0;
                const progressByPage = Object.fromEntries(state.pages.flatMap((page, index) => {
                    const ids = stepIds(page);
                    if (!ids.length) return [];
                    const passed = ids.flatMap((id, step) => has(stepKey(page.id!, id)) ? [step] : []);
                    const checkpointStep = index === currentPageId ? ids.indexOf(progress.checkpoint.step) : -1;
                    const firstUnfinished = ids.findIndex((_, step) => !passed.includes(step));
                    const next = checkpointStep >= 0 ? checkpointStep : firstUnfinished < 0 ? ids.length - 1 : firstUnfinished;
                    const safeIndex = ids.slice(0, next).every((_, step) => passed.includes(step)) ? next : Math.max(0, firstUnfinished);
                    return [[index, { index: safeIndex, completed: passed }]];
                }));
                set({ currentPageId, subpageIndex: progressByPage[currentPageId]?.index ?? 0, progressByPage, resumeTasks: true,
                    visitedPages: new Set([0, ...visited, currentPageId]), savedUnlocked: new Set(unlocked), restoredCompletedPages: new Set(completed) });
            },
            mergeSavedProgress: progress => {
                const state = get();
                const visitedPages = new Set(state.visitedPages);
                const savedUnlocked = new Set(state.savedUnlocked);
                const restoredCompletedPages = new Set(state.restoredCompletedPages);
                const progressByPage = { ...state.progressByPage };
                for (let index = 0; index < state.pages.length; index++) {
                    const page = state.pages[index];
                    if (!page.id) continue;
                    if (progress.milestones.includes(`visit:${page.id}`)) visitedPages.add(index);
                    if (progress.milestones.includes(`unlock:${page.id}`)) savedUnlocked.add(index);
                    if (index === state.currentPageId) continue;
                    if (progress.milestones.includes(`complete:${page.id}`)) restoredCompletedPages.add(index);
                    const completed = stepIds(page).flatMap((step, stepIndex) => progress.milestones.includes(stepKey(page.id!, step)) ? [stepIndex] : []);
                    if (completed.length) progressByPage[index] = { index: state.progressByPage[index]?.index ?? completed[completed.length - 1], completed: [...new Set([...(state.progressByPage[index]?.completed ?? []), ...completed])].sort((a, b) => a - b) };
                }
                if (visitedPages.size !== state.visitedPages.size || savedUnlocked.size !== state.savedUnlocked.size || restoredCompletedPages.size !== state.restoredCompletedPages.size || JSON.stringify(progressByPage) !== JSON.stringify(state.progressByPage)) {
                    set({ visitedPages, savedUnlocked, restoredCompletedPages, progressByPage });
                }
            },
            focusRequest: null,
            openSession: (sessionId, next, nextSource) => {
                source = nextSource;
                if (get().sessionId === sessionId) {
                    get().setDefinition(next);
                    get().syncHistory(source.getHistory());
                    return;
                }
                started = false;
                set({ ...next, sessionId, layout: layoutPathway(next.pages, next.transitions),
                    history: source.getHistory(), now: now(), currentPageId: 0, subpageIndex: 0, replayKey: get().replayKey + 1, resumeTasks: false,
                    progressByPage: {}, visitedPages: new Set([0]), traversed: new Set(), savedUnlocked: new Set(), restoredCompletedPages: new Set(), focusRequest: null });
            },
            setDefinition: next => {
                if (get().pages === next.pages && get().transitions === next.transitions) return;
                set({ ...next, layout: layoutPathway(next.pages, next.transitions) });
            },
            syncHistory: history => { if (get().history !== history) set({ history, now: now() }); },
            refreshTime: () => {
                if (get().transitions.some(transition => transition.from === get().currentPageId)) set({ now: now() });
            },
            start: () => {
                if (started) return;
                started = true;
                if (get().pages.length > 0) recordArrival(get().currentPageId);
            },
            navigatePage: pageId => {
                const state = freshState();
                if (pageId === state.currentPageId || !state.pages[pageId]) return;
                const available = state.transitions.flatMap((transition, index) => transition.to === pageId && transitionAvailable(state, transition) ? [transitionKey(transition, index)] : []);
                if (!state.visitedPages.has(pageId) && !state.savedUnlocked.has(pageId) && available.length === 0) return;
                source.addPageVisit(state.currentPageId);
                set({ currentPageId: pageId, subpageIndex: 0, replayKey: state.replayKey + 1, resumeTasks: false,
                    progressByPage: { ...state.progressByPage, [pageId]: { index: 0, completed: [] } },
                    visitedPages: new Set([...state.visitedPages, pageId]),
                    traversed: available.length ? new Set([...state.traversed, available[0]]) : state.traversed });
                recordArrival(pageId);
            },
            navigateSubpage: (pageId, index) => {
                const state = freshState();
                if (!state.visitedPages.has(pageId) || pageId === state.currentPageId && index === state.subpageIndex) return;
                const progress = state.progressByPage[pageId];
                const ready = pageId === state.currentPageId ? canAdvanceSubpage(state) : Boolean(progress?.completed.includes(progress.index));
                const next = selectSubpage(pageSubpages(state, pageId).length, progress, index, ready);
                if (!next) return;
                const changedPage = pageId !== state.currentPageId;
                if (changedPage) source.addPageVisit(state.currentPageId);
                // Each presentation gets a new version, including revisiting the same subpage.
                set({ currentPageId: pageId, subpageIndex: index, replayKey: state.replayKey + 1, resumeTasks: false, progressByPage: { ...state.progressByPage, [pageId]: next } });
                if (changedPage) recordArrival(pageId);
            },
            replayPage: pageId => {
                const state = get();
                if (!canReplayPage(state, pageId)) return;
                if (pageId !== state.currentPageId) { get().navigatePage(pageId); return; }
                set({ subpageIndex: 0, replayKey: state.replayKey + 1, resumeTasks: false, restoredCompletedPages: new Set([...state.restoredCompletedPages].filter(id => id !== pageId)), progressByPage: { ...state.progressByPage, [pageId]: { index: 0, completed: [] } } });
            },
            markSubpageReady: (pageId, index, sessionId, replayKey) => {
                const state = get();
                if (sessionId !== undefined && sessionId !== state.sessionId) return;
                if (replayKey !== undefined && replayKey !== state.replayKey) return;
                if (pageId !== state.currentPageId || index !== state.subpageIndex || index < 0 || index >= pageSubpages(state).length) return;
                const progress = state.progressByPage[pageId];
                if (progress?.completed.includes(index) && progress.index === index) return;
                set({ progressByPage: { ...state.progressByPage, [pageId]: { index, completed: [...new Set([...(progress?.completed ?? []), index])] } } });
            },
            completePage: ({ pageId, subpageIndex, sessionId, replayKey }) => {
                const state = freshState();
                if (sessionId !== state.sessionId || replayKey !== state.replayKey
                    || pageId !== state.currentPageId || subpageIndex !== state.subpageIndex
                    || !getDynamicPage(state.pages[pageId])) return;
                const labels = pageSubpages(state);
                if (labels.length > 0 && !subpageControls(labels.length, state.progressByPage[pageId], false).canReplay) return;
                if (state.history.entries.some(entry => entry.actionType === "page_complete" && entry.page_id === pageId)) return;
                source.recordAction({ actionType: "page_complete", page_id: pageId, timestamp: now() });
                get().syncHistory(source.getHistory());
            },
            moveFocus: (pageId, key) => {
                const nodes = get().layout.nodes;
                const index = nodes.findIndex(node => node.id === pageId);
                const next = key === "Home" ? 0 : key === "End" ? nodes.length - 1 : Math.max(0, Math.min(nodes.length - 1, index + (key === "ArrowDown" || key === "ArrowRight" ? 1 : -1)));
                if (nodes[next]) set({ focusRequest: { pageId: nodes[next].id, serial: (get().focusRequest?.serial ?? 0) + 1 } });
            },
        };
    });
}

export type PathwayStore = ReturnType<typeof createPathwayStore>;
