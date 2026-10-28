import type { components } from "./api.ts";
export type Network = components["schemas"]["NeuralLayer"][];
export type Activation = components["schemas"]["NeuralLayer"]["activation"];
export type Loss = components["schemas"]["TrainingData"]["explorerLoss"];
export type Trace = components["schemas"]["NeuralTrace"];
export type Sample = components["schemas"]["NeuralSample"];
export type Curve = components["schemas"]["NeuralCurve"];
export type Grid = components["schemas"]["NeuralGrid"];
export type ParameterSelection = components["schemas"]["ParameterSelection"];
export const activations: Activation[] = ["sigmoid", "tanh", "hard tanh", "ReLU", "linear"];
export const losses: Loss[] = ["MSE", "MAE", "Binary cross-entropy", "Categorical cross-entropy"];
export const alphabet = [..."abcdefghijklmnopqrstuvwxyzäöüßéèêàç"];
export const languageNames = ["English", "French", "German"];
// Static examples only; predictions and features are returned by the backend.
export const gates: Record<string, Sample[]> = {
    AND: [{ x: [0, 0], y: [0] }, { x: [0, 1], y: [0] }, { x: [1, 0], y: [0] }, { x: [1, 1], y: [1] }],
    OR: [{ x: [0, 0], y: [0] }, { x: [0, 1], y: [1] }, { x: [1, 0], y: [1] }, { x: [1, 1], y: [1] }],
    XOR: [{ x: [0, 0], y: [0] }, { x: [0, 1], y: [1] }, { x: [1, 0], y: [1] }, { x: [1, 1], y: [0] }],
};
