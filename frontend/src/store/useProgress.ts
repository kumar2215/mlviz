import { useStore } from "zustand";
import { initializeFirebase } from "../lib/firebase";
import { createProgressService } from "../lib/progressService";
import { startProgressSync } from "../lib/progressSync";
import { createProgressStore, PROGRESS_STORAGE_KEY } from "./progressStore";
import { authSession } from "./useAuthSession";

let storage: globalThis.Storage | null = null;
try { storage = window.localStorage; } catch { /* The store exposes a storage-unavailable message. */ }
export const progressStore = createProgressStore(storage, { clientId: crypto.randomUUID() });
export function useProgress<T>(selector: (state: ReturnType<typeof progressStore.getState>) => T): T { return useStore(progressStore, selector); }

export function startLearningProgress() {
    const firebase = initializeFirebase();
    const stopSync = firebase.auth && firebase.db ? startProgressSync(progressStore, createProgressService(firebase.auth, firebase.db)) : () => {};
    let authGeneration = 0;
    const ownerChanged = () => {
        const account = authSession.getState();
        if (account.status === "loading") return;
        const uid = account.user?.uid ?? null;
        const current = ++authGeneration;
        // Serialize guest consumption across tabs and reread the latest envelope inside the lock.
        const apply = () => {
            if (current !== authGeneration) return;
            try { progressStore.getState().reconcileStorage(storage?.getItem(PROGRESS_STORAGE_KEY) ?? null); } catch { /* Retry is available in the UI. */ }
            progressStore.getState().setOwner(uid);
        };
        if (navigator.locks) void navigator.locks.request("mlviz-progress-import", apply).catch(apply);
        else apply();
    };
    const stopAuth = authSession.subscribe((state, previous) => {
        if (state.user?.uid !== previous.user?.uid || state.status !== previous.status) ownerChanged();
    });
    const external = (event: StorageEvent) => { if (event.key === PROGRESS_STORAGE_KEY) { progressStore.getState().reconcileStorage(event.newValue); ownerChanged(); } };
    const online = () => progressStore.getState().retry();
    window.addEventListener("storage", external);
    window.addEventListener("online", online);
    ownerChanged();
    return () => { authGeneration++; stopSync(); stopAuth(); window.removeEventListener("storage", external); window.removeEventListener("online", online); };
}
