import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { StaticPageParameters } from "../src/types/page.ts";

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

const { default: ActivityIntroduction } = await import("../src/components/layout/ActivityIntroduction.tsx");
const { default: useStaticMarkdown } = await import("../src/hooks/useStaticMarkdown.ts");
const { default: NameTreeParts } = await import("../src/pages/traditional_ml/decision_tree/lesson/NameTreeParts.tsx");
const { default: MarkdownWrapper } = await import("../src/components/markdown/MarkdownWrapper.tsx");

const original = createElement("h2", { className: "text-lg font-semibold" }, "Original activity title");
const introduction = createElement(ActivityIntroduction, { children: original });

function IntroductionFromSource({ source }: { source: StaticPageParameters }) {
    const narration = useStaticMarkdown(source);
    return createElement(ActivityIntroduction, { narration, children: original });
}

function TreeFromSource({ source }: { source: StaticPageParameters }) {
    const narration = useStaticMarkdown(source);
    return createElement(NameTreeParts, { narration, onComplete() {} });
}

test("visualisation mode and empty narration preserve the exact original introduction markup", () => {
    const expected = renderToStaticMarkup(original);
    assert.equal(renderToStaticMarkup(introduction), expected);
    for (const text of ["", "  \n "]) {
        const html = renderToStaticMarkup(createElement(IntroductionFromSource, {
            source: { text, path: "" },
        }));
        assert.equal(html, expected);
    }
});

test("inline story narration takes precedence over a file and replaces only the introduction", () => {
    const text = readFileSync(new URL("../public/md/dtree/decision_tree_03.md", import.meta.url), "utf8");
    const html = renderToStaticMarkup(createElement(TreeFromSource, {
        source: { text, path: "unused.md" },
    }));
    assert.match(html, /<section[^>]*bg-white/);
    assert.match(html, /<h2>Parts of a tree<\/h2>/);
    assert.equal(html.match(/Parts of a tree/g)?.length, 1);
    assert.doesNotMatch(html, /Label the tree|Loading narration|title: Parts of a tree/);
    assert.match(html, /0 \/ 4 matched/);
    assert.match(html, /Match labels to the lettered parts of the tree/);
    for (const part of ["Root", "Branch", "Split node", "Leaf"]) assert.ok(html.includes(`Label ${part}`));
    assert.match(html, /max-h-\[30vh\].*overflow-y-auto/);
});

test("loading and failed documents stay in the introduction slot with accessible fallback messages", () => {
    const loading = renderToStaticMarkup(createElement(IntroductionFromSource, {
        source: { text: "", path: "pending.md" },
    }));
    assert.match(loading, /role="status"[^>]*>Loading narration/);
    assert.doesNotMatch(loading, /Original activity title/);

    const failed = renderToStaticMarkup(createElement(ActivityIntroduction, {
        narration: { content: "", loading: false, error: "File not found" }, children: original,
    }));
    assert.match(failed, /Original activity title/);
    assert.match(failed, /role="alert"[^>]*>Could not load story narration: File not found/);
});

test("activity Markdown keeps formatting and maths while using compact headings without frontmatter", () => {
    const html = renderToStaticMarkup(createElement(MarkdownWrapper, {
        variant: "activity",
        children: "---\ntitle: Hidden metadata\n---\n# A heading\n\n**Bold** and *emphasis* with `code` and [a link](https://example.com).\n\n- One\n- Two\n\n$x^2$",
    }));
    assert.match(html, /<h2>A heading<\/h2>/);
    assert.match(html, /<strong>Bold<\/strong>/);
    assert.match(html, /<em>emphasis<\/em>/);
    assert.match(html, /<code>code<\/code>/);
    assert.match(html, /href="https:\/\/example.com"/);
    assert.match(html, /<ul>[\s\S]*<li>One<\/li>[\s\S]*<li>Two<\/li>/);
    assert.match(html, /mjx-container/);
    assert.doesNotMatch(html, /Hidden metadata|text-\[calc\(/);
});

test("every bundled mixed story page renders its Markdown once in the shared introduction", () => {
    let checked = 0;
    for (const name of ["decision_tree", "text_preprocessing"]) {
        const story = JSON.parse(readFileSync(new URL(`../public/config/story/${name}.json`, import.meta.url), "utf8"));
        for (const page of story.pages) {
            if (page.page_type !== "mixed") continue;
            const source = page.static_page;
            const text = source.text || readFileSync(new URL(`../public/${source.path}`, import.meta.url), "utf8");
            const html = renderToStaticMarkup(createElement(IntroductionFromSource, {
                source: { text, path: "" },
            }));
            assert.equal(html.match(/aria-label="Story introduction"/g)?.length, 1, source.path);
            assert.match(html, /<h2>.+<\/h2>/, source.path);
            assert.doesNotMatch(html, /Original activity title/, source.path);
            checked++;
        }
    }
    assert.equal(checked, 12);
});
