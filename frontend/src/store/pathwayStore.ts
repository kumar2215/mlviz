import { createStore } from "zustand/vanilla";
import type { HistoryEntry, HistoryState } from "../types/history.ts";
import type { PageUnion, Parameters } from "../types/page.ts";
import type { Transition } from "../types/story.ts";
import { displayCondition, isConditionMet } from "../utils/conditions.ts";
import { pageTitle, getDynamicPage, layoutPathway, selectSubpage, subpageControls, transitionKey, type PathwayLayout, type SubpageProgress } from "../components/navigation/pathwayModel.ts";

export interface PathwayDefinition { pages: PageUnion[]; transitions: Transition[] }
export interface PageProgressContext {
    pageId: number;
    subpageIndex: number;
    sessionId: string | null;
    replayKey: number;
}
export interface PathwayHistorySource {
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
    visitedPages: ReadonlySet<number>;
    traversed: ReadonlySet<string>;
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
        || state.history.entries.some(entry => entry.actionType === "page_complete" && entry.page_id === state.currentPageId);
}

export function canExitPage(state: PathwayState): boolean {
    const labels = pageSubpages(state);
    return labels.length === 0 || state.subpageIndex === labels.length - 1
        || subpageControls(labels.length, state.progressByPage[state.currentPageId], false).canReplay;
}

export function transitionAvailable(state: PathwayState, transition: Transition): boolean {
    return transition.from === state.currentPageId && canExitPage(state) && isConditionMet(transition.condition,
        { ...state.history.params, __history: state.history, __now: state.now } as unknown as Record<string, Parameters>,
        { sourcePageId: transition.from });
}

export function selectPathwayNode(state: PathwayState, pageId: number) {
    const active = pageId === state.currentPageId;
    const incoming = state.layout.edges.filter(edge => edge.to === pageId && edge.from === state.currentPageId);
    const status = active ? "current" : state.visitedPages.has(pageId) ? "visited" : incoming.some(edge => transitionAvailable(state, edge.transition)) ? "available" : "locked";
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
            progressByPage: {},
            visitedPages: new Set([0]),
            traversed: new Set(),
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
                    history: source.getHistory(), now: now(), currentPageId: 0, subpageIndex: 0, replayKey: get().replayKey + 1,
                    progressByPage: {}, visitedPages: new Set([0]), traversed: new Set(), focusRequest: null });
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
                if (!state.visitedPages.has(pageId) && available.length === 0) return;
                source.addPageVisit(state.currentPageId);
                set({ currentPageId: pageId, subpageIndex: 0, replayKey: state.replayKey + 1,
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
                set({ currentPageId: pageId, subpageIndex: index, replayKey: state.replayKey + 1, progressByPage: { ...state.progressByPage, [pageId]: next } });
                if (changedPage) recordArrival(pageId);
            },
            replayPage: pageId => {
                const state = get();
                if (!subpageControls(pageSubpages(state, pageId).length, state.progressByPage[pageId], false).canReplay) return;
                if (pageId !== state.currentPageId) { get().navigatePage(pageId); return; }
                set({ subpageIndex: 0, replayKey: state.replayKey + 1, progressByPage: { ...state.progressByPage, [pageId]: { index: 0, completed: [] } } });
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
