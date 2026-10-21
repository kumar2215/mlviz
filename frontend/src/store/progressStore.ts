import { createStore } from "zustand/vanilla";
import { emptyBucket, emptyProgress, mergeProgress, readProgress, sameProgress, stableId, type ProgressBucket, type StoryProgress } from "../lib/storyProgress.ts";

export interface ProgressData { version: 1; clientId: string; guestGeneration: number; imports: Record<string, string>; guest: ProgressBucket; accounts: Record<string, ProgressBucket> }
interface Storage { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
export const PROGRESS_STORAGE_KEY = "mlviz.story-progress.v1";
const uidValid = (uid: string) => uid.length > 0 && uid.length <= 128 && !["__proto__", "constructor", "prototype"].includes(uid) && !uid.includes("/");
const add = (values: string[], value: string) => [...new Set([...values, value])].sort();

function parseBucket(input: unknown): ProgressBucket {
    if (!input || typeof input !== "object") throw new Error("Invalid progress bucket");
    const raw = input as ProgressBucket;
    if (!raw.stories || typeof raw.stories !== "object" || Array.isArray(raw.stories) || Object.keys(raw.stories).length > 200
        || !Array.isArray(raw.pending) || !raw.pending.every(stableId)) throw new Error("Invalid saved stories");
    const stories: Record<string, StoryProgress> = {};
    for (const [id, value] of Object.entries(raw.stories)) {
        const progress = readProgress(value);
        if (!stableId(id) || !progress) throw new Error("Invalid saved checkpoint");
        stories[id] = progress;
    }
    return { stories, pending: [...new Set(raw.pending)].filter(id => Object.prototype.hasOwnProperty.call(stories, id)).sort() };
}
function readData(raw: string, clientId: string): ProgressData {
    const value = JSON.parse(raw) as ProgressData;
    if (value.version !== 1 || !value.accounts || typeof value.accounts !== "object" || Array.isArray(value.accounts)
        || Object.keys(value.accounts).length > 100) throw new Error("Unsupported saved progress");
    const accounts: Record<string, ProgressBucket> = {};
    for (const [uid, bucket] of Object.entries(value.accounts)) {
        if (!uidValid(uid)) throw new Error("Invalid saved account");
        accounts[uid] = parseBucket(bucket);
    }
    if (!Number.isSafeInteger(value.guestGeneration) || value.guestGeneration < 0 || !value.imports || typeof value.imports !== "object"
        || !Object.entries(value.imports).every(([generation, uid]) => /^\d+$/.test(generation) && Number(generation) < value.guestGeneration && typeof uid === "string" && uidValid(uid))) throw new Error("Invalid guest import history");
    return { version: 1, clientId, guestGeneration: value.guestGeneration, imports: value.imports, guest: parseBucket(value.guest), accounts };
}
export function mergeBucket(a: ProgressBucket, b: ProgressBucket, queue = true): ProgressBucket {
    const stories = { ...a.stories };
    let pending = [...new Set([...a.pending, ...b.pending])].sort();
    for (const [id, value] of Object.entries(b.stories)) {
        const merged = mergeProgress(stories[id], value);
        if (!sameProgress(merged, stories[id]) && queue) pending = add(pending, id);
        stories[id] = merged;
    }
    return { stories, pending };
}

export function createProgressStore(storage: Storage | null, { clientId = "client", now = () => Date.now() } = {}) {
    let initial: ProgressData = { version: 1, clientId, guestGeneration: 0, imports: {}, guest: emptyBucket(), accounts: {} };
    let initialError: string | null = null;
    try { const raw = storage?.getItem(PROGRESS_STORAGE_KEY); if (raw) initial = readData(raw, clientId); }
    catch { initialError = "Saved progress couldn't be read. Your existing browser data has not been overwritten. New progress will be kept in memory until it can be saved."; }
    if (!storage) initialError = "Browser storage is unavailable. Progress will last only for this tab until storage is available.";

    return createStore<{
        data: ProgressData; owner: string | null; epoch: number; storageError: string | null; syncError: string | null;
        syncing: boolean; remoteReady: boolean; retryVersion: number; notice: { id: number; text: string } | null;
        setOwner: (uid: string | null) => void;
        update: (storyId: string, milestones: string[], page: string, step: string, epoch: number) => boolean;
        receive: (storyId: string, remote: StoryProgress, epoch: number) => void;
        reconcileStorage: (raw: string | null) => void;
        retry: () => void;
        announce: (text: string) => void;
        dismissNotice: () => void;
        setSyncState: (state: { syncing?: boolean; remoteReady?: boolean; syncError?: string | null }) => void;
    }>((set, get) => {
        const write = (data: ProgressData): boolean => {
            try {
                if (!storage) throw new Error("No browser storage");
                storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
                set({ storageError: null });
                return true;
            } catch {
                set({ storageError: "Progress couldn't be saved in this browser. Keep this tab open and retry after freeing browser storage. Guest progress has not been discarded." });
                return false;
            }
        };
        const commit = (data: ProgressData) => { write(data); set({ data }); };
        return {
            data: initial, owner: null, epoch: 0, storageError: initialError, syncError: null, syncing: false, remoteReady: true, retryVersion: 0, notice: null,
            setOwner: uid => {
                if (uid !== null && !uidValid(uid)) return;
                const state = get();
                let data = state.data;
                if (uid && Object.keys(data.guest.stories).length) {
                    const merged = mergeBucket(data.accounts[uid] ?? emptyBucket(), data.guest);
                    const next = { ...data, accounts: { ...data.accounts, [uid]: merged }, guest: emptyBucket(), guestGeneration: data.guestGeneration + 1, imports: { ...data.imports, [data.guestGeneration]: uid } };
                    // A single durable envelope write transfers ownership before consuming guest data.
                    if (write(next)) data = next;
                }
                set({ data, owner: uid, ...(uid !== state.owner ? { epoch: state.epoch + 1, notice: null, syncing: false, remoteReady: uid === null, syncError: null } : {}) });
            },
            update: (storyId, milestones, page, step, epoch) => {
                const state = get();
                if (state.epoch !== epoch || !stableId(storyId) || !stableId(page) || step !== "" && !stableId(step)) return false;
                const bucket = state.owner ? state.data.accounts[state.owner] ?? emptyBucket() : state.data.guest;
                const previous = bucket.stories[storyId] ?? emptyProgress();
                const changed = milestones.some(id => !previous.milestones.includes(id));
                if (!changed && previous.checkpoint.page === page && previous.checkpoint.step === step) return false;
                const next = readProgress({ version: 1, milestones: [...previous.milestones, ...milestones], checkpoint: { page, step, at: Math.max(now(), previous.checkpoint.at + 1), client: state.data.clientId } });
                if (!next) return false;
                const updated = { stories: { ...bucket.stories, [storyId]: next }, pending: state.owner ? add(bucket.pending, storyId) : [] };
                commit(state.owner ? { ...state.data, accounts: { ...state.data.accounts, [state.owner]: updated } } : { ...state.data, guest: updated });
                return changed;
            },
            receive: (storyId, remote, epoch) => {
                const state = get();
                if (!state.owner || epoch !== state.epoch || !stableId(storyId)) return;
                const bucket = state.data.accounts[state.owner] ?? emptyBucket();
                const merged = mergeProgress(bucket.stories[storyId], remote);
                const pending = sameProgress(merged, remote) ? bucket.pending.filter(id => id !== storyId) : add(bucket.pending, storyId);
                if (sameProgress(merged, bucket.stories[storyId]) && JSON.stringify(pending) === JSON.stringify(bucket.pending)) return;
                commit({ ...state.data, accounts: { ...state.data.accounts, [state.owner]: { stories: { ...bucket.stories, [storyId]: merged }, pending } } });
            },
            reconcileStorage: raw => {
                if (!raw) return;
                try {
                    const state = get();
                    const incoming = readData(raw, state.data.clientId);
                    const accounts = { ...state.data.accounts };
                    for (const [uid, bucket] of Object.entries(incoming.accounts)) accounts[uid] = mergeBucket(accounts[uid] ?? emptyBucket(), bucket);
                    const imports = { ...state.data.imports, ...incoming.imports };
                    const guestGeneration = Math.max(state.data.guestGeneration, incoming.guestGeneration);
                    let guest = emptyBucket();
                    for (const copy of [state.data, incoming]) {
                        const claimedBy = imports[copy.guestGeneration];
                        if (claimedBy) accounts[claimedBy] = mergeBucket(accounts[claimedBy] ?? emptyBucket(), copy.guest);
                        else if (copy.guestGeneration === guestGeneration) guest = mergeBucket(guest, copy.guest, false);
                    }
                    const data = { ...state.data, guest, accounts, imports, guestGeneration };
                    if (JSON.stringify(data) !== JSON.stringify(state.data)) commit(data);
                } catch { set({ storageError: "Progress from another tab couldn't be read. Your current progress is still available." }); }
            },
            retry: () => { get().setOwner(get().owner); write(get().data); set({ retryVersion: get().retryVersion + 1, syncError: null }); },
            announce: text => set({ notice: { id: (get().notice?.id ?? 0) + 1, text } }),
            dismissNotice: () => set({ notice: null }),
            setSyncState: state => set(state),
        };
    });
}
export type ProgressStore = ReturnType<typeof createProgressStore>;
const EMPTY_BUCKET = emptyBucket();
export const activeBucket = (state: ReturnType<ProgressStore["getState"]>) => state.owner ? state.data.accounts[state.owner] ?? EMPTY_BUCKET : state.data.guest;
