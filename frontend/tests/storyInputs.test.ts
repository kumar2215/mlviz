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
const { default: RegexIndex } = await import("../src/pages/nlp/regex/index.tsx");
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

test("regex basics renders one pathway topic at a time with only three introductory terms", () => {
    const topics = ["Text &amp; tokens", "Pattern symbols", "Flags"];
    for (const mode of ["story", "visualisation"] as const) {
        setMode(mode);
        for (let subpageIndex = 0; subpageIndex < topics.length; subpageIndex++) {
            const html = renderToStaticMarkup(createElement(RegexIndex, {
                name: "Regex Basics", parameters: {}, subpageIndex,
                narration: mode === "story" ? {
                    content: readFileSync(new URL("../public/md/tokenization/regex-basics.md", import.meta.url), "utf8"),
                    loading: false, error: null,
                } : undefined,
                onComplete() {}, onSubpageReady() {},
            }));
            assert.match(html, new RegExp(`aria-label="${topics[subpageIndex]}"`));
            assert.match(html, new RegExp(`<h2[^>]*>${topics[subpageIndex]}<\\/h2>`));
            assert.doesNotMatch(html, /<nav|Regex basics topics|Loading regex examples|\d of 3|Mark as read|Marked as read|Choose the next arc/);
            if (subpageIndex === 0) {
                assert.equal(html.match(/<dt[ >]/g)?.length, 3);
                for (const term of ["Pattern", "Match", "Token"]) assert.match(html, new RegExp(`<dt[^>]*>${term}<\\/dt>`));
                assert.match(html, /The cat naps\./);
                assert.doesNotMatch(html, /Unicode|Signed decimal|Contraction|Whitespace|<table|type="checkbox"/);
            } else if (subpageIndex === 1) {
                assert.match(html, /Common regex symbols and their meanings/);
                assert.doesNotMatch(html, /See how a pattern finds text/);
                assert.doesNotMatch(html, /<dl|type="checkbox"/);
            } else {
                assert.match(html, /type="checkbox"/);
                assert.match(html, /Flag examples/);
                assert.match(html, /sample pattern and text stay fixed/);
                assert.doesNotMatch(html, /See how a pattern finds text|playground&#x27;s pattern field|without Python quotes|<textarea/);
                assert.doesNotMatch(html, /<dl|<table/);
            }
        }
    }
});

test("BPE basics shows its three topics as individual pathway subpages in both modes", () => {
    const topics = ["BPE &amp; terms", "A merge example", "Training &amp; tokenizing"];
    const content = readFileSync(new URL("../public/md/bpe/basics.md", import.meta.url), "utf8");
    for (const mode of ["story", "visualisation"] as const) {
        setMode(mode);
        for (let subpageIndex = 0; subpageIndex < topics.length; subpageIndex++) {
            const html = renderToStaticMarkup(createElement(BpeIndex, {
                name: "BPE Basics", parameters: {}, subpageIndex,
                narration: mode === "story" ? { content, loading: false, error: null } : undefined,
                onComplete() {}, onSubpageReady() {},
            }));
            assert.match(html, new RegExp(`aria-label="${topics[subpageIndex]}"`));
            assert.match(html, new RegExp(`<h2[^>]*>${topics[subpageIndex]}<\\/h2>`));
            assert.doesNotMatch(html, /<nav|BPE basics topics|Mark as read|\d of 3/);
            if (subpageIndex === 0) {
                assert.match(html, /Why learn pieces of words\?/);
                assert.doesNotMatch(html, /Weighted pair counts|Next merge|Next: train your own/);
            } else if (subpageIndex === 1) {
                assert.match(html, /Weighted pair counts|Current tokens/);
                assert.match(html, /Next merge/);
                assert.doesNotMatch(html, /<dl|Learn rules first|Next: train your own|Learn how frequent neighboring/);
            } else {
                assert.match(html, /Learn rules first, then reuse them/);
                assert.match(html, /Next: train your own/);
                assert.doesNotMatch(html, /<dl|Next merge|Weighted pair counts|Learn how frequent neighboring/);
            }
        }
    }
});
