import { activeBucket, type ProgressStore } from "../store/progressStore.ts";
import type { StoryProgress } from "./storyProgress.ts";

export interface ProgressService {
    watch: (uid: string, next: (storyId: string, value: StoryProgress) => void, error: () => void, ready?: () => void) => () => void;
    merge: (uid: string, storyId: string, value: StoryProgress) => Promise<StoryProgress>;
}

export function startProgressSync(store: ProgressStore, service: ProgressService, debounceMs = 400) {
    let generation = 0, busy = false, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    let stopWatch: (() => void) | undefined;
    const schedule = (delay = debounceMs) => {
        if (busy || timer || !store.getState().owner || !activeBucket(store.getState()).pending.length) return;
        timer = setTimeout(() => { timer = undefined; void flush(); }, delay);
    };
    const flush = async () => {
        const state = store.getState();
        if (!state.owner || busy) return;
        const storyId = activeBucket(state).pending[0];
        if (!storyId) return;
        const value = activeBucket(state).stories[storyId];
        const current = generation;
        busy = true;
        store.getState().setSyncState({ syncing: true });
        try {
            const merged = await service.merge(state.owner, storyId, value);
            if (generation !== current) return;
            store.getState().receive(storyId, merged, state.epoch);
            failures = 0;
            store.getState().setSyncState({ syncError: null });
        } catch {
            if (generation !== current) return;
            failures++;
            store.getState().setSyncState({ syncError: "Progress is saved on this device, but account sync couldn't finish. Check your connection and retry." });
        } finally {
            if (generation === current) {
                busy = false;
                store.getState().setSyncState({ syncing: false });
                schedule(failures ? Math.min(30000, 1000 * 2 ** Math.min(failures, 5)) : debounceMs);
            }
        }
    };
    const restart = () => {
        generation++;
        if (timer) clearTimeout(timer);
        timer = undefined;
        stopWatch?.();
        if (readyTimer) clearTimeout(readyTimer);
        stopWatch = undefined;
        busy = false; failures = 0;
        const { owner, epoch } = store.getState();
        const current = generation;
        if (!owner) return;
        const ready = () => { if (generation === current) store.getState().setSyncState({ remoteReady: true }); };
        // An unavailable connection must never prevent local learning.
        readyTimer = setTimeout(ready, 2000);
        try {
            stopWatch = service.watch(owner, (storyId, value) => {
                if (generation === current) store.getState().receive(storyId, value, epoch);
            }, () => {
                if (generation === current) store.getState().setSyncState({ remoteReady: true, syncError: "Account progress couldn't be loaded. Local progress is retained; retry when connected." });
            }, ready);
        } catch {
            store.getState().setSyncState({ remoteReady: true, syncError: "Account progress couldn't be loaded. Local progress is retained; retry when connected." });
        }
        schedule();
    };
    const unsubscribe = store.subscribe((state, previous) => {
        if (state.owner !== previous.owner || state.retryVersion !== previous.retryVersion) restart();
        else if (state.data !== previous.data) schedule();
    });
    restart();
    return () => { generation++; unsubscribe(); stopWatch?.(); if (timer) clearTimeout(timer); if (readyTimer) clearTimeout(readyTimer); };
}
