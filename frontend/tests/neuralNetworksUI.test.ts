import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ts from "typescript";
import type { IndexPageProps } from "../src/types/page.ts";

// Same TSX / alias loader as the existing component-render tests.
const sourceRoot = new URL("../src/", import.meta.url);
registerHooks({
    resolve(specifier, context, nextResolve) {
        const candidate = specifier.startsWith("@/") ? new URL(specifier.slice(2), sourceRoot)
            : specifier.startsWith(".") && context.parentURL?.startsWith(sourceRoot.href) ? new URL(specifier, context.parentURL) : null;
        if (candidate && !/\.[cm]?[jt]sx?$/.test(candidate.pathname)) {
            for (const extension of [".tsx", ".ts"]) {
                const url = new URL(candidate.href + extension);
                if (existsSync(url)) return nextResolve(url.href, context);
            }
        }
        return nextResolve(candidate?.href ?? specifier, context);
    },
    load(url, context, nextLoad) {
        // SSR normally reads initial snapshots; these tests inspect current lab state.
        if (url.endsWith("/zustand/esm/react.mjs")) return { format: "module", source: readFileSync(new URL(url), "utf8").replaceAll("api.getInitialState()", "api.getState()"), shortCircuit: true };
        if (url.startsWith(sourceRoot.href) && url.endsWith(".tsx")) {
            const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
                fileName: fileURLToPath(url), compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
            });
            return { format: "module", source: outputText, shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});

const components: Record<string, ComponentType<IndexPageProps>> = {};
for (const lab of ["perceptron", "single_layer", "mlp", "training"]) components[lab] = (await import(`../src/pages/neural_networks/${lab}/index.tsx`)).default;
const { useMlp, useNeuralPresentation, usePerceptron, useSingleLayer, useTraining } = await import("../src/store/neuralNetworks.ts");
function render(lab: string, name: string) {
    return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(components[lab], { name, parameters: {}, onComplete() {} })));
}
const { backendFetch } = await import("./helpers/neuralBackend.ts");
globalThis.fetch = backendFetch;
for (const store of [usePerceptron, useSingleLayer, useMlp, useTraining]) await store.getState().reset();

test("every topic and control group uses the bounded NLP frame without banners or cross-visualization links", () => {
    for (const [lab] of Object.entries(components)) {
        const config = JSON.parse(readFileSync(new URL(`../public/config/visual/neural_networks/${lab}.json`, import.meta.url), "utf8"));
        for (const page of config.pages) {
            assert.equal(page.id, undefined);
            const initial = render(lab, page.name);
            const id = initial.match(/data-page-id="([^"]+)"/)![1];
            const slides = [...initial.matchAll(/data-slide-id="([^"]+)"/g)].map(match => match[1]);
            assert.ok(slides.length > 1);
            assert.equal(new Set(slides).size, slides.length);
            for (const slide of slides) {
                useNeuralPresentation.getState().selectSlide(id, slide);
                const html = render(lab, page.name);
                assert.ok(html.includes(`data-active-slide="${slide}"`));
                assert.equal([...html.matchAll(/data-active-slide=/g)].length, 1);
                assert.match(html, /Inputs &amp; parameters/);
                assert.doesNotMatch(html, /Â|Ã|â€|âˆ/);
                assert.match(html, /<main[^>]*h-full min-h-0 overflow-hidden p-3/);
                assert.doesNotMatch(html, /Interactive lab|Next lab|Unknown .*page|Coming soon|NaN|Infinity|href="[^"]*\/viz\//);
            }
            const groups = initial.match(/<select[^>]*aria-label="Control group"[^>]*>(.*?)<\/select>/)?.[1];
            for (const match of groups?.matchAll(/<option value="([^"]+)"/g) ?? []) {
                useNeuralPresentation.getState().selectControls(id, match[1]);
                assert.ok(render(lab, page.name).includes(`data-control-id="${match[1]}"`));
            }
        }
    }
});

test("custom inputs, XOR solution, language input and dropout inference render backend results", async () => {
    await usePerceptron.getState().patch({ input: [2, 3], custom: true });
    useNeuralPresentation.getState().selectSlide("perceptron/matrix", "calculation");
    const matrix = render("perceptron", "Matrix Calculation");
    assert.match(matrix, /Input x = \[2, 3\]/);
    assert.match(matrix, /grid-template-columns:repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(matrix, /ring-inset/);
    await useMlp.getState().loadXor();
    useNeuralPresentation.getState().selectSlide("mlp/xor", "boundary");
    assert.match(render("mlp", "Why Nonlinearity"), /4\/4 correct/);
    await useMlp.getState().patch({ training: false });
    useNeuralPresentation.getState().selectSlide("mlp/dropout", "output");
    assert.match(render("mlp", "Dropout Masks"), /No mask or scaling at inference/);
    await useSingleLayer.getState().patch({ text: "123!" });
    useNeuralPresentation.getState().selectSlide("single_layer/language", "process");
    const language = render("single_layer", "Language Identification");
    assert.match(language, /No recognized letters/); assert.doesNotMatch(language, /Prediction:/);
});

test("backend preview is rendered without applying it and errors can be retried", async () => {
    await useTraining.getState().reset();
    const before = structuredClone(useTraining.getState().data!.network);
    useNeuralPresentation.getState().selectSlide("training/updates", "update");
    assert.match(render("training", "Gradient Descent Updates"), /Apply gradient update/);
    assert.deepEqual(useTraining.getState().data!.network, before);
    await useTraining.getState().apply();
    assert.match(render("training", "Gradient Descent Updates"), /Update 1 applied/);
    useTraining.setState({ result: null, error: "Backend unavailable" });
    const error = render("training", "Gradient Descent Updates");
    assert.match(error, /role="alert"/); assert.match(error, /Retry/);
});
