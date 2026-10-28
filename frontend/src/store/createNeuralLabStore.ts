import { create, type StateCreator } from "zustand";
import { calculateNeuralLab, type NeuralCommand, type NeuralLab, type NeuralResponses } from "../api/neural_networks.ts";

export interface RemoteLab<L extends NeuralLab> {
    data: NeuralResponses[L]["state"] | null;
    result: NeuralResponses[L]["result"] | null;
    loading: boolean;
    error: string | null;
    patch: (patch: Partial<NeuralResponses[L]["state"]>) => Promise<void>;
    request: (command?: NeuralCommand, patch?: Partial<NeuralResponses[L]["state"]>) => Promise<void>;
    reset: () => Promise<void>;
    refresh: () => Promise<void>;
    retry: () => Promise<void>;
    cancel: () => void;
}

export function createNeuralLabStore<L extends NeuralLab, Actions extends object>(lab: L, actions: (set: Parameters<StateCreator<RemoteLab<L> & Actions>>[0], get: () => RemoteLab<L> & Actions) => Actions) {
    return create<RemoteLab<L> & Actions>((set, get) => {
        let revision = 0;
        let controller: AbortController | null = null;
        let lastCommand: NeuralCommand = { action: "evaluate" };
        async function request(command: NeuralCommand = { action: "evaluate" }, patch: Partial<NeuralResponses[L]["state"]> = {}) {
            const current = ++revision;
            controller?.abort();
            controller = new AbortController();
            lastCommand = command;
            const previous = get().data;
            const data = previous ? { ...previous, ...patch } : null;
            set({ data, loading: true, error: null } as Partial<RemoteLab<L> & Actions>);
            try {
                const response = await calculateNeuralLab(lab, data, command, controller.signal);
                if (current !== revision) return;
                // Stage/play controls are local and may change while a calculation is pending.
                const local = get().data;
                const controls = Object.fromEntries(["playing", "phase", "forwardPhase"].filter(key => local && key in local).map(key => [key, local![key as keyof typeof local]]));
                const changedPlayback = local && data && "playing" in local && "playing" in data && local.playing !== data.playing;
                set({ data: { ...response.state, ...(command.action === "evaluate" ? controls : {}), ...(!["reset", "initialize", "architecture", "solution"].includes(command.action) && changedPlayback ? { playing: local.playing } : {}) }, result: response.result, loading: false } as Partial<RemoteLab<L> & Actions>);
            } catch (error) {
                if (current !== revision) return;
                set({ loading: false, error: error instanceof Error ? error.message : "Calculation failed.", data: data && "playing" in data ? { ...data, playing: false } : data } as Partial<RemoteLab<L> & Actions>);
            }
        }
        return {
            data: null, result: null, loading: false, error: null,
            request,
            patch: async patch => {
                if (Object.keys(patch).every(key => ["playing", "phase", "forwardPhase"].includes(key))) {
                    if (get().data) set({ data: { ...get().data, ...patch } } as Partial<RemoteLab<L> & Actions>);
                    return;
                }
                await request({ action: "evaluate" }, patch);
            },
            reset: () => request({ action: "reset" }),
            refresh: () => request(),
            retry: () => request(lastCommand),
            cancel: () => { ++revision; controller?.abort(); const current = get(); set({ loading: false, ...(current.loading ? { result: null } : {}), ...(current.data && "playing" in current.data ? { data: { ...current.data, playing: false } } : {}) } as Partial<RemoteLab<L> & Actions>); },
            ...actions(set, get),
        };
    });
}
