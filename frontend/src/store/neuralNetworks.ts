import { create } from "zustand";
import { createNeuralLabStore } from "./createNeuralLabStore.ts";
import type { Activation, ParameterSelection } from "../types/neuralNetworks.ts";
import type { NeuralLab, NeuralResponses } from "../api/neural_networks.ts";
export type { NeuralLab } from "../api/neural_networks.ts";
export type { ParameterSelection } from "../types/neuralNetworks.ts";

type AsyncAction = () => Promise<void>;
interface PerceptronActions {
    randomize: AsyncAction; learn: AsyncAction;
    parameter: (column: number, value: number) => Promise<void>;
    chooseSample: (index: number, gate?: "AND" | "OR" | "XOR") => Promise<void>;
}
export const usePerceptron = createNeuralLabStore<"perceptron", PerceptronActions>("perceptron", (_, get) => ({
    randomize: () => get().request({ action: "initialize" }),
    parameter: (column, value) => get().request({ action: "parameter", selection: { layer: 0, row: 0, column }, value }),
    chooseSample: (index, gate) => get().request({ action: "sample", index }, { ...(gate ? { gate, history: [] } : {}), playing: false }),
    learn: async () => { if (!get().loading) await get().request({ action: "learn" }); },
}));
interface SingleLayerActions {
    randomize: AsyncAction;
    parameter: (row: number, column: number, value: number, language?: boolean) => Promise<void>;
    score: (index: number, value: number) => Promise<void>;
    shift: AsyncAction;
}
export const useSingleLayer = createNeuralLabStore<"single_layer", SingleLayerActions>("single_layer", (_, get) => ({
    randomize: () => get().request({ action: "initialize" }),
    parameter: (row, column, value, language = false) => get().request({ action: "parameter", selection: { layer: 0, row, column }, value, language }),
    score: (index, value) => get().request({ action: "score", index, value }),
    shift: () => get().request({ action: "shift" }),
}));
interface MlpActions {
    randomize: AsyncAction; train: AsyncAction; loadXor: AsyncAction;
    architecture: (hidden: number[], activation: Activation) => Promise<void>;
    parameter: (selection: ParameterSelection, value: number) => Promise<void>;
    newMask: (p?: number, variant?: "element" | "feature") => Promise<void>;
    toggleMask: (row: number, column: number) => Promise<void>;
}
export const useMlp = createNeuralLabStore<"mlp", MlpActions>("mlp", (_, get) => ({
    randomize: () => get().request({ action: "initialize" }),
    architecture: (hidden, activation) => get().request({ action: "architecture" }, { hidden, activation, xorMode: activation === "linear" ? "linear" : "nonlinear" }),
    parameter: (selection, value) => get().request({ action: "parameter", selection, value }),
    loadXor: () => get().request({ action: "solution" }),
    train: async () => { if (!get().loading) await get().request({ action: "train" }); },
    newMask: (p, variant) => get().request({ action: "mask" }, { ...(p === undefined ? {} : { dropoutP: p }), ...(variant ? { dropoutVariant: variant } : {}) }),
    toggleMask: (row, column) => get().request({ action: "toggle", selection: { layer: 0, row, column } }),
}));
interface TrainingActions {
    randomize: AsyncAction; next: AsyncAction; apply: AsyncAction;
    configure: (patch: Partial<NeuralResponses["training"]["state"]>) => Promise<void>;
    parameter: (selection: ParameterSelection, value: number) => Promise<void>;
}
export const useTraining = createNeuralLabStore<"training", TrainingActions>("training", (_, get) => ({
    randomize: () => get().request({ action: "initialize" }),
    configure: patch => get().request({ action: "evaluate" }, { ...patch, phase: 0, history: [], playing: false, message: "" }),
    parameter: (selection, value) => get().request({ action: "parameter", selection, value }, { phase: 0, history: [], playing: false, message: "" }),
    next: async () => { const s = get(); if (s.loading || !s.data) return; if (s.data.phase < 3) await s.patch({ phase: s.data.phase + 1 }); else await s.apply(); },
    apply: async () => { if (!get().loading) await get().request({ action: "apply" }); },
}));

interface PresentationState {
    views: Record<string, { slide?: string; controls?: string; itemPage?: number }>;
    selectSlide: (page: string, slide: string) => void;
    selectControls: (page: string, controls: string) => void;
    selectItems: (page: string, itemPage: number) => void;
    reset: (lab: NeuralLab) => void;
}
export const useNeuralPresentation = create<PresentationState>(set => ({
    views: {},
    selectSlide: (page, slide) => set(state => ({ views: { ...state.views, [page]: { ...state.views[page], slide } } })),
    selectControls: (page, controls) => set(state => ({ views: { ...state.views, [page]: { ...state.views[page], controls } } })),
    selectItems: (page, itemPage) => set(state => ({ views: { ...state.views, [page]: { ...state.views[page], itemPage } } })),
    reset: lab => set(state => ({ views: Object.fromEntries(Object.entries(state.views).filter(([page]) => !page.startsWith(`${lab}/`))) })),
}));
interface LabVisit { sessionId: string | null; page: string; replayKey: number }
interface LabVisits {
    visits: Partial<Record<NeuralLab, LabVisit>>;
    enter: (lab: NeuralLab, sessionId: string | null, page: string, replayKey: number) => Promise<void>;
}
// The pathway increments replayKey both for navigation and explicit replay.
// Preserve lab inputs on a different page; reset only a new session or same-page replay.
export const useNeuralVisits = create<LabVisits>((set, get) => ({ visits: {}, enter: async (lab, sessionId, page, replayKey) => {
    const previous = get().visits[lab];
    if (previous?.sessionId === sessionId && previous.page === page && previous.replayKey === replayKey) return;
    set(state => ({ visits: { ...state.visits, [lab]: { sessionId, page, replayKey } } }));
    if (!previous || previous.sessionId !== sessionId || previous.page === page) {
        const resets = { perceptron: usePerceptron.getState().reset, single_layer: useSingleLayer.getState().reset, mlp: useMlp.getState().reset, training: useTraining.getState().reset };
        useNeuralPresentation.getState().reset(lab);
        await resets[lab]();
    }
} }));
