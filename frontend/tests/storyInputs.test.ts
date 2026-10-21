import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { RegexState } from "../src/api/text_preprocessing.ts";

// Render the real TSX components with the existing Node test runner and Vite aliases.
const sourceRoot = new URL("../src/", import.meta.url);
registerHooks({
    resolve(specifier, context, nextResolve) {
        const candidate = specifier.startsWith("@/")
            ? new URL(specifier.slice(2), sourceRoot)
            : specifier.startsWith(".") && context.parentURL?.startsWith(sourceRoot.href)
                ? new URL(specifier, context.parentURL)
                : null;
        if (candidate && !/\.[cm]?[jt]sx?$/.test(candidate.pathname)) {
            for (const extension of [".tsx", ".ts"]) {
                const url = new URL(candidate.href + extension);
                if (existsSync(url)) return nextResolve(url.href, context);
            }
        }
        return nextResolve(candidate?.href ?? specifier, context);
    },
    load(url, context, nextLoad) {
        // Use current snapshots during SSR so these component tests can switch modes.
        if (url.endsWith("/zustand/esm/react.mjs")) {
            const source = readFileSync(new URL(url), "utf8").replaceAll("api.getInitialState()", "api.getState()");
            return { format: "module", source, shortCircuit: true };
        }
        if (url === new URL("api/config.ts", sourceRoot).href) {
            return { format: "module", source: 'export const API_BASE_URL = "";', shortCircuit: true };
        }
        if (url.startsWith(sourceRoot.href) && url.endsWith(".tsx")) {
            const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
                fileName: fileURLToPath(url),
                compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
            });
            return { format: "module", source: outputText, shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});

const { useStory } = await import("../src/store/useStory.ts");
const { useVisualisation } = await import("../src/store/useVisualisation.ts");
const { useTokenization } = await import("../src/store/nlp/useTextPreprocessing.ts");
const { default: WordsEditor } = await import("../src/pages/nlp/shared/WordsEditor.tsx");
const { default: RegexEditor } = await import("../src/pages/nlp/regex/RegexEditor.tsx");
const { default: BpeIndex } = await import("../src/pages/nlp/tokenization/index.tsx");

function setMode(mode: "story" | "visualisation") {
    useStory.setState({ currentStory: mode === "story" ? { name: "test", display_name: "Test", pages: [], transitions: [] } : null });
    useVisualisation.setState({ currentVisualisation: mode === "visualisation" ? { name: "test", display_name: "Test", category: "nlp", pages: [], transitions: [] } : null });
}

const data: RegexState = {
    text: "Configured story text",
    options: [{ id: "word", label: "Words", pattern: "[a-z]+" }],
    goals: [{ id: "goal", title: "Find words", text: "Fixed challenge text" }],
};

test("word and BPE test-word editors are fixed in stories and editable in viz", () => {
    for (const label of ["Words (up to six)", "Test words (up to four)"]) {
        const props = { value: "running runs", label, onChange() {}, onApply() {}, pending: false };
        setMode("story");
        const story = renderToStaticMarkup(createElement(WordsEditor, props));
        assert.match(story, /<input[^>]*readOnly=""/);
        assert.match(story, /value="running runs"/);
        assert.doesNotMatch(story, /<button/);
        setMode("visualisation");
        const viz = renderToStaticMarkup(createElement(WordsEditor, props));
        assert.doesNotMatch(viz, /readOnly/);
        assert.match(viz, /<button[^>]*>Use words<\/button>/);
    }
});

test("story regex ignores saved viz drafts, locks only source text, and preserves answer controls", () => {
    const draft = { text: "Easy saved viz text", pattern: "saved-pattern", flags: ["DOTALL" as const] };
    useTokenization.setState({ regexDraft: draft });
    setMode("story");
    // No narration is needed to enforce the story policy.
    const story = renderToStaticMarkup(createElement(RegexEditor, { data }));
    assert.match(story, /<textarea[^>]*readOnly=""[^>]*>Configured story text<\/textarea>/);
    assert.doesNotMatch(story, /Easy saved viz text|saved-pattern/);
    assert.match(story, /<input[^>]*aria-label="Regex pattern"[^>]*value="\[a-z\]\+"/);
    assert.doesNotMatch(story.match(/<input[^>]*aria-label="Regex pattern"[^>]*>/)?.[0] ?? "", /readOnly|disabled/);
    assert.doesNotMatch(story.match(/<select[^>]*aria-label="Pattern preset"[^>]*>/)?.[0] ?? "", /disabled/);
    assert.deepEqual(useTokenization.getState().regexDraft, draft);

    const challenge = renderToStaticMarkup(createElement(RegexEditor, { data, goal: data.goals[0] }));
    assert.match(challenge, /<textarea[^>]*readOnly=""[^>]*>Fixed challenge text<\/textarea>/);

    setMode("visualisation");
    const viz = renderToStaticMarkup(createElement(RegexEditor, { data }));
    assert.doesNotMatch(viz, /readOnly/);
    assert.match(viz, /Easy saved viz text/);
    assert.match(viz, /saved-pattern/);
});

test("BPE uses the fixed story exercise even without narration", () => {
    setMode("story");
    const props = { name: "BPE Lab", parameters: {}, onComplete() {} };
    const story = renderToStaticMarkup(createElement(BpeIndex, props));
    assert.match(story, /role="status"/);
    assert.doesNotMatch(story, /BPE corpus|Merge budget|Use corpus/);

    setMode("visualisation");
    const viz = renderToStaticMarkup(createElement(BpeIndex, props));
    assert.match(viz, /aria-label="BPE corpus"/);
    assert.match(viz, /aria-label="Merge budget"/);
    assert.match(viz, /Use corpus/);
});
