import { useEffect } from "react";
import { usePathway } from "@/store/usePathway";
import { useNeuralVisits, usePerceptron, useSingleLayer, useMlp, useTraining, type NeuralLab } from "@/store/neuralNetworks";

export function useLabSession(lab: NeuralLab, page: string, replayKey = 0) {
    const sessionId = usePathway(state => state.sessionId);
    useEffect(() => {
        void useNeuralVisits.getState().enter(lab, sessionId, page, replayKey);
        const store = { perceptron: usePerceptron, single_layer: useSingleLayer, mlp: useMlp, training: useTraining }[lab];
        const state = store.getState();
        if (!state.loading && !state.result) void state.retry();
        return () => store.getState().cancel();
    }, [lab, sessionId, page, replayKey]);
}
