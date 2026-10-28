import assert from "node:assert/strict";
import { test } from "node:test";
import { useMlp, useNeuralPresentation, useNeuralVisits, usePerceptron, useSingleLayer, useTraining } from "../src/store/neuralNetworks.ts";
import { backendFetch, backendReply } from "./helpers/neuralBackend.ts";

test("Zustand receives backend parameter updates and keeps numeric and language models independent", async () => {
    const original = globalThis.fetch; globalThis.fetch = backendFetch;
    try {
        await usePerceptron.getState().reset();
        await usePerceptron.getState().patch({ input: [1, 0], target: 0, custom: true, rate: 0.1 });
        await usePerceptron.getState().learn();
        assert.deepEqual(usePerceptron.getState().data!.network[0].weights[0], [0.5, -0.4]);
        assert.equal(usePerceptron.getState().data!.history[0].error, -1);
        await useSingleLayer.getState().reset();
        const before = structuredClone(useSingleLayer.getState().data!.languageNetwork);
        await useSingleLayer.getState().parameter(0, 0, 2);
        assert.deepEqual(useSingleLayer.getState().data!.languageNetwork, before);
        await useMlp.getState().reset(); await useMlp.getState().loadXor();
        assert.equal(useMlp.getState().result!.multi.correct, 4);
        await useTraining.getState().reset();
        const proposed = useTraining.getState().result!.proposed;
        await useTraining.getState().apply();
        assert.deepEqual(useTraining.getState().data!.network, proposed);
    } finally { globalThis.fetch = original; }
});

test("late responses cannot overwrite newer edits, reset, or a cancelled lab", async () => {
    const original = globalThis.fetch;
    const initial = backendReply("perceptron");
    usePerceptron.setState({ data: initial.state, result: initial.result, error: null, loading: false });
    const pending: { body: object; resolve: (response: Response) => void; signal: AbortSignal }[] = [];
    globalThis.fetch = async (_url, options) => new Promise(resolve => pending.push({ body: JSON.parse(String(options!.body)), resolve, signal: options!.signal as AbortSignal }));
    try {
        const first = usePerceptron.getState().patch({ input: [2, 3] });
        const second = usePerceptron.getState().patch({ input: [4, 5] });
        assert.equal(pending[0].signal.aborted, true);
        pending[1].resolve(Response.json(backendReply("perceptron", pending[1].body))); await second;
        pending[0].resolve(Response.json(backendReply("perceptron", pending[0].body))); await first;
        assert.deepEqual(usePerceptron.getState().data!.input, [4, 5]);
        const edit = usePerceptron.getState().patch({ input: [6, 7] });
        const reset = usePerceptron.getState().reset();
        pending[3].resolve(Response.json(initial)); await reset;
        pending[2].resolve(Response.json(backendReply("perceptron", pending[2].body))); await edit;
        assert.deepEqual(usePerceptron.getState().data!.input, [0, 1]);
        const cancelled = usePerceptron.getState().patch({ input: [8, 9] });
        usePerceptron.getState().cancel();
        pending[4].resolve(Response.json(backendReply("perceptron", pending[4].body))); await cancelled;
        assert.equal(usePerceptron.getState().result, null);
        assert.equal(usePerceptron.getState().loading, false);
        const replay = usePerceptron.getState().reset();
        usePerceptron.getState().cancel();
        const retried = usePerceptron.getState().retry();
        pending[6].resolve(Response.json(initial)); await retried;
        pending[5].resolve(Response.json(initial)); await replay;
        assert.deepEqual(usePerceptron.getState().data!.input, [0, 1]);
        await usePerceptron.getState().patch({ playing: true });
        const paused = usePerceptron.getState().learn();
        await usePerceptron.getState().patch({ playing: false });
        pending[7].resolve(Response.json(backendReply("perceptron", pending[7].body))); await paused;
        assert.equal(usePerceptron.getState().data!.playing, false);
    } finally { globalThis.fetch = original; }
});

test("failed backend requests stop playback and retry the requested calculation", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = backendFetch;
    try {
        await usePerceptron.getState().reset();
        await usePerceptron.getState().patch({ playing: true });
        globalThis.fetch = async () => Response.json({ detail: "Backend unavailable" }, { status: 503 });
        await usePerceptron.getState().parameter(0, 3);
        assert.match(usePerceptron.getState().error!, /Backend unavailable/);
        assert.equal(usePerceptron.getState().data!.playing, false);
        globalThis.fetch = backendFetch;
        await usePerceptron.getState().retry();
        assert.equal(usePerceptron.getState().error, null);
        assert.equal(usePerceptron.getState().data!.network[0].weights[0][0], 3);
    } finally { globalThis.fetch = original; }
});

test("pathway navigation preserves inputs and presentation; replay resets them", async () => {
    const original = globalThis.fetch; globalThis.fetch = backendFetch;
    try {
        const enter = useNeuralVisits.getState().enter;
        await enter("perceptron", "session-a", "Inside a Perceptron", 1);
        await usePerceptron.getState().patch({ input: [3, 4] });
        useNeuralPresentation.getState().selectSlide("perceptron/intro", "calculation");
        await enter("perceptron", "session-a", "Matrix Calculation", 2);
        assert.deepEqual(usePerceptron.getState().data!.input, [3, 4]);
        assert.equal(useNeuralPresentation.getState().views["perceptron/intro"].slide, "calculation");
        await enter("perceptron", "session-a", "Matrix Calculation", 3);
        assert.deepEqual(usePerceptron.getState().data!.input, [0, 1]);
        assert.equal(useNeuralPresentation.getState().views["perceptron/intro"], undefined);
    } finally { globalThis.fetch = original; }
});
