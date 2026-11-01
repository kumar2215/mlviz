import { create } from "zustand";
import type { TourAction, TourSetup, VisualisationTour } from "../components/tours/tourDefinitions.ts";

export interface TourTicket { scope: string; run: number; revision: number; step: number; action: TourAction }
interface TourState {
    scope: string | null;
    tour: VisualisationTour | null;
    running: boolean;
    step: number;
    run: number;
    revision: number;
    reviewing: boolean;
    canContinue: boolean;
    message: string;
    bind: (scope: string, tour: VisualisationTour | undefined) => void;
    unbind: (scope: string) => void;
    start: () => void;
    stop: (message?: string) => void;
    next: () => void;
    back: () => void;
    skipSetup: (ready: Partial<Record<TourSetup, boolean>>) => void;
    capture: (action: TourAction) => TourTicket | null;
    complete: (ticket: TourTicket | null, success: boolean) => void;
}

export const createTourStore = () => create<TourState>((set, get) => ({
    scope: null, tour: null, running: false, step: 0, run: 0, revision: 0, reviewing: false, canContinue: false, message: "",
    bind: (scope, tour) => { if (get().scope !== scope) set({ scope, tour: tour ?? null, running: false, step: 0, revision: get().revision + 1, message: "" }); },
    unbind: scope => { if (get().scope === scope) set({ scope: null, tour: null, running: false, revision: get().revision + 1, message: "" }); },
    start: () => { if (get().tour) set({ running: true, step: 0, run: get().run + 1, revision: get().revision + 1, reviewing: false, canContinue: false, message: "" }); },
    stop: (message = "") => set({ running: false, revision: get().revision + 1, message }),
    next: () => {
        const state = get();
        if (!state.running || (state.tour?.steps[state.step]?.action && !state.canContinue)) return;
        if (state.step + 1 >= (state.tour?.steps.length ?? 0)) state.stop();
        else set({ step: state.step + 1, revision: state.revision + 1, reviewing: false, canContinue: false, message: "" });
    },
    back: () => { const state = get(); if (state.running && state.step > 0) set({ step: state.step - 1, revision: state.revision + 1, reviewing: true, canContinue: false, message: "" }); },
    skipSetup: ready => {
        const state = get();
        if (!state.running) return;
        if (state.reviewing) {
            const setup = state.tour?.steps[state.step]?.setup;
            const canContinue = Boolean(setup && ready[setup]);
            if (state.canContinue !== canContinue) set({ canContinue });
            return;
        }
        let step = state.step;
        while (state.tour?.steps[step]?.setup && ready[state.tour.steps[step].setup!]) step++;
        if (step !== state.step) set({ step, revision: state.revision + 1, message: "" });
    },
    capture: action => {
        const state = get();
        return state.running && state.scope && state.tour?.steps[state.step]?.action === action
            ? { scope: state.scope, run: state.run, revision: state.revision, step: state.step, action } : null;
    },
    complete: (ticket, success) => {
        const state = get();
        if (!ticket || !state.running || ticket.scope !== state.scope || ticket.run !== state.run || ticket.revision !== state.revision || ticket.step !== state.step || ticket.action !== state.tour?.steps[state.step]?.action) return;
        if (!success) { set({ message: "That action did not finish. Check the controls and try again, or skip the tour." }); return; }
        set({ step: state.step + 1, revision: state.revision + 1, reviewing: false, canContinue: false, message: "" });
    },
}));

export const useTour = createTourStore();

/** Capture before an async action so late results cannot advance a different tour step. */
export function captureTourAction(action: TourAction) {
    const ticket = useTour.getState().capture(action);
    return (success = true) => useTour.getState().complete(ticket, success);
}
