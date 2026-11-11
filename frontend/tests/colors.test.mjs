import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { palette, generatedColors, checkGeneratedColors } from "../scripts/generate-colors.mjs";
import { approvedColors, checkSourceColors, checkCssColors, checkSvgColors, contrastRatio, isPurple } from "../scripts/check-colors.mjs";
import { DEFAULT_COLORS, createColorScale, createContinuousColorScale } from "../src/utils/colorUtils.ts";

test("palette generates matching CSS and concrete chart values without stale copies", () => {
    assert.deepEqual(checkGeneratedColors(), []);
    assert.equal(checkGeneratedColors((path, encoding) => readFileSync(path, encoding) + "\n/* manual edit */").length, 2);
    const generated = [...generatedColors()].map(([, content]) => content).join("\n");
    for (const value of approvedColors()) assert.ok(generated.includes(value));
    assert.ok(generated.includes("--color-pathway-current: var(--pathway-current)"));
    assert.ok(generated.includes("--color-primary: var(--primary)"));
    const changed = structuredClone(palette);
    changed.ui.primary = changed.ui.primaryHover;
    assert.notDeepEqual([...generatedColors(changed).values()], [...generatedColors().values()]);
});

test("colour checker rejects literals, numbered/arbitrary utilities and local gradients", () => {
    const examples = [
        'const value = <div className="bg-blue-600 text-white" />;',
        'const value = <div className="hover:bg-red-50/80" />;',
        'const value = <div className="bg-[#123456]" />;',
        'const value = <div className="bg-[steelblue]" />;',
        'const value = <div className="text-[color:var(--primary)]" />;',
        'const value = <div className="shadow-[0_2px_4px_tomato]" />;',
        'const value = <div className="text-[rgb(12,3,4)]" />;',
        'const value = <div className="bg-primary/80 opacity-75" />;',
        'const value = <div style={{color:"#2563eb"}} />;',
        'const value = <div style={{color:"steelblue"}} />;',
        'const color = "red";',
        'node.attr("fill", "green");',
        'const value = <div className="bg-gradient-to-r from-primary to-brand" />;',
        'const value = `background: hsl(${angle}, 50%, 50%)`;',
        'const value = `border:1px solid steelblue;`;',
        'const value = <div className={`bg-${family}-500`} />;',
    ];
    for (const source of examples) assert.ok(checkSourceColors(source).length, source);
});

test("checker permits role tokens, size utilities, metadata, URLs and animation fill modes", () => {
    const source = [
        '// bg-red-500 and #ff0000 in a comment are not styles.',
        'const purple = "purples"; const label = "The red class";',
        'const data = {id:"#abc",url:"https://example.com/#abcdef",path:"/to-home"};',
        'const markerId = "#abc"; const ref = <use href="#abc" />;',
        'document.querySelector("#abc");',
        'const element = <div className="bg-primary text-primary-foreground text-[12px] ring-2 opacity-0" style={{color:uiColors.foreground}} />;',
        'node.attr("stroke", chartColors.proposal);',
        'element.animate([{opacity:0},{opacity:1}], {fill:"both"});',
        'const item = <div className={`bg-surface ${extra}`} />;',
    ].join("\n");
    assert.deepEqual(checkSourceColors(source), []);
    assert.deepEqual(checkCssColors(".card { color: var(--foreground); background: var(--surface); }"), []);
    assert.deepEqual(checkCssColors("#abc:hover {color:var(--foreground)} .note {content:'#abc'}"), []);
    assert.deepEqual(checkCssColors(":root {color-scheme:light;--font-style:normal} #abc {border-collapse:collapse;background:url('image.svg#abc')}"), []);
    assert.ok(checkCssColors(".card {border:1px solid tomato}").length);
    assert.ok(checkCssColors(".card {@apply outline-ring/50}").length);
    assert.ok(checkCssColors(".card {@apply bg-blue-600;}").length);
    assert.ok(checkCssColors(".card {color: #fff}").length);
    assert.ok(checkCssColors(".card {background: linear-gradient(to right, var(--primary), var(--brand))}").length);
});

test("chart helpers preserve default colours, categorical aliases and purple-free continuous aliases", () => {
    assert.deepEqual(DEFAULT_COLORS, ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#0891b2", "#8c564b", "#eab308", "#7f7f7f", "#bcbd22", "#1e3a8a"]);
    assert.deepEqual(createColorScale(["a", "b"], "category10").range(), DEFAULT_COLORS);
    for (const [name, colors] of Object.entries(palette.categorical)) assert.deepEqual(createColorScale(["a", "b"], name).range(), colors);
    const canonical = {};
    for (const [alias, scheme] of Object.entries(palette.continuous)) {
        const scale = createContinuousColorScale([0, 1], alias);
        const samples = Array.from({length: 257}, (_, index) => scale(index / 256));
        // Interpolators can return rgb() strings; convert them before checking hue.
        const hex = samples.map(value => value.startsWith("#") ? value : "#" + value.match(/\d+/g).slice(0, 3).map(channel => Number(channel).toString(16).padStart(2, "0")).join(""));
        assert.ok(hex.every(value => !isPurple(value)), alias);
        if (canonical[scheme]) assert.deepEqual(samples, canonical[scheme], alias);
        else canonical[scheme] = samples;
    }
});

test("SVGs accept only palette fills/strokes and preserve IDs and inherited colours", () => {
    assert.deepEqual(checkSvgColors('<svg><path id="abcdef" fill="' + palette.ui.primary + '" stroke="none"/><use href="#abc" fill="url(#gradient)"/></svg>'), []);
    assert.ok(checkSvgColors('<svg><path fill="#818cf8"/></svg>').length);
    assert.ok(checkSvgColors('<svg><path style="fill:purple;stroke:#123456"/></svg>').length);
    for (const name of ["soccat-marker.svg", "dtree_diagram.svg"]) assert.deepEqual(checkSvgColors(readFileSync(new URL("../public/images/" + name, import.meta.url), "utf8")), []);
});

test("approved pairs meet contrast and the palette contains no purple", () => {
    for (const [foreground, background] of palette.contrastPairs) assert.ok(contrastRatio(palette.ui[foreground], palette.ui[background]) >= 4.5, foreground + " on " + background);
    for (const background of ["surface", "surfaceSubtle", "surfaceRecessed", "selection"]) {
        for (const role of ["ring", "controlBorder"]) assert.ok(contrastRatio(palette.ui[role], palette.ui[background]) >= 3, role + " on " + background);
    }
    assert.ok(contrastRatio(palette.ui.rewardOutline, palette.ui.rewardTrack) >= 3);
    for (const role of ["current", "proposal", "fitted", "error"]) {
        for (const surface of ["surface", "surfaceSubtle"]) assert.ok(contrastRatio(palette.chart[role], palette.ui[surface]) >= 3, role + " on " + surface);
    }
    assert.ok([...approvedColors()].every(color => !isPurple(color)));
    assert.equal(isPurple("#818cf8"), true);
    assert.equal(isPurple(palette.ui.primary), false);
});
