import { API_BASE_URL } from "./config.ts";
import { postJson } from "./postJson.ts";
import type { components } from "../types/api.ts";

export type NeuralLab = "perceptron" | "single_layer" | "mlp" | "training";
type Command = components["schemas"]["NeuralCommand"];
export type NeuralCommand = Pick<Command, "action"> & Partial<Omit<Command, "action">>;
export interface NeuralResponses {
    perceptron: components["schemas"]["PerceptronResponse"];
    single_layer: components["schemas"]["SingleLayerResponse"];
    mlp: components["schemas"]["MlpResponse"];
    training: components["schemas"]["TrainingResponse"];
}

export function calculateNeuralLab<L extends NeuralLab>(lab: L, state: NeuralResponses[L]["state"] | null, command: NeuralCommand, signal?: AbortSignal): Promise<NeuralResponses[L]> {
    return postJson(`${API_BASE_URL}/api/neural_networks/${lab}`, { state, command }, signal);
}
