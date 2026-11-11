import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { palette, checkGeneratedColors } from "./generate-colors.mjs";

const families = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const utility = "bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|accent|caret|shadow|divide";
const numbered = new RegExp(`(?:${utility})-(?:${families})-(?:50|[1-9]00|950)(?!\\d)`);
const neutralUtility = new RegExp(`(?:${utility})-(?:white|black)(?![\\w-])`);
const arbitrary = new RegExp(`(?:${utility})-\\[(?:#|(?:rgb|hsl|oklch|oklab|color|var)\\(|(?:red|blue|green|white|black)\\])`);
const alphaUtility = new RegExp(`(?:${utility})-[a-z][\\w-]*/(?:\\d+|\\[)`);
const hex = /#[\da-f]{3}(?:[\da-f](?:[\da-f]{2}(?:[\da-f]{2})?)?)?\b/i;
const colorFunction = /\b(?:rgba?|hsla?|hwb|lab|lch|oklch|oklab|color|color-mix|light-dark)\(/i;
const gradient = /(?:linear|radial|conic)-gradient\(|\bbg-(?:gradient|linear|radial|conic)-|(?<![\w-])(?:from|via|to)-(?:[a-z]+|\[)/;
const colorKeys = new Set(["color", "background", "backgroundColor", "background-color", "borderColor", "border-color", "fill", "stroke", "outlineColor", "stop-color"]);
const inherited = new Set(["transparent", "currentColor", "currentcolor", "context-stroke", "none", "inherit", "initial", "unset"]);
const cssNames = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen").split(" "));

function utilityMessage(value) {
    if (numbered.test(value) || neutralUtility.test(value)) return "Use semantic colour utilities instead of numbered, white or black utilities.";
    const arbitraryNamed = [...value.matchAll(new RegExp(`(?:${utility})-\\[([^\\]]+)\\]`, "g"))].some(match => {
        const content = match[1];
        return /^(?:color|background|fill|stroke):/.test(content) || content.split(/[^a-z-]+/i).some(word => cssNames.has(word.toLowerCase()));
    });
    if (arbitrary.test(value) || arbitraryNamed || alphaUtility.test(value)) return "Use a named colour/opacity recipe instead of an arbitrary colour utility.";
    if (/(?<![\w-])opacity-(?:[1-9]\d?)(?!\d)/.test(value)) return "Use a named opacity recipe; numeric zero/one visibility endpoints are permitted.";
}

function inColorContext(node) {
    const parent = node.parent;
    if (ts.isPropertyAssignment(parent) && parent.name.getText() === "fill" && ["both", "forwards", "backwards", "auto"].includes(node.text)) return false;
    if (ts.isVariableDeclaration(parent) || ts.isParameter(parent)) return colorKeys.has(parent.name.getText()) || /Color$/.test(parent.name.getText());
    if (ts.isJsxAttribute(parent) || ts.isPropertyAssignment(parent)) return colorKeys.has(parent.name.getText().replace(/["']/g, ""));
    if (ts.isCallExpression(parent) && parent.arguments[1] === node && /\.(?:attr|style)$/.test(parent.expression.getText())) {
        return colorKeys.has(parent.arguments[0]?.text);
    }
    return false;
}

/** Inspect parsed string/template values; comments, identifiers and colour-name aliases are not styles. */
export function checkSourceColors(source, filename = "component.tsx") {
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, /\.[jt]sx$/.test(filename) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const findings = [];
    function visit(node) {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
            const value = node.text;
            const selector = ts.isCallExpression(node.parent) && /\.(?:querySelector|querySelectorAll|getElementById)$/.test(node.parent.expression.getText());
            const namedParent = ts.isPropertyAssignment(node.parent) || ts.isJsxAttribute(node.parent) || ts.isVariableDeclaration(node.parent) || ts.isParameter(node.parent);
            const identifier = namedParent && /(?:^id$|Id$|^href$|^xlinkHref$|^url$|^selector$|^path$)/.test(node.parent.name.getText().replace(/["']/g, ""));
            if (!selector && !identifier && !/^(?:https?:|data:|\/|url\(#)/.test(value)) {
                let message = utilityMessage(value);
                if (!message) {
                    if ((ts.isTemplateHead(node) || ts.isTemplateMiddle(node)) && new RegExp(`(?:${utility})-$`).test(value)) message = "Select a complete semantic utility; do not assemble colour utilities dynamically.";
                    else if (hex.test(value) || colorFunction.test(value)) message = "Import a colour token instead of declaring a raw colour.";
                    else if (!filename.replaceAll("\\", "/").endsWith("/theme/recipes.ts") && gradient.test(value)) message = "Use a named gradient recipe.";
                    else if (inColorContext(node) && /^[a-z-]+$/i.test(value) && !inherited.has(value)) message = "Use a token instead of a named CSS colour.";
                    else if (checkCssColors(value).length) message = "Use tokens or named recipes in embedded CSS.";
                }
                if (message) findings.push({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, message });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(ast);
    return findings;
}

export function checkCssColors(source) {
    const clean = source.replace(/\/\*[\s\S]*?\*\//g, match => "\n".repeat(match.split("\n").length - 1));
    const findings = [];
    for (const match of clean.matchAll(/@apply\s+([^;}]+)(?:;|})/g)) {
        const message = utilityMessage(match[1]) || (gradient.test(match[1]) ? "Use a named gradient recipe." : undefined);
        if (message) findings.push({ line: clean.slice(0, match.index).split("\n").length, message });
    }
    const declarations = /(?:^|[;{])\s*(--[\w-]+|background(?:-color|-image)?|color|fill|stroke|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|filter|stop-color|flood-color|caret-color|accent-color)\s*:\s*([^;{}]+)/gm;
    for (const match of clean.matchAll(declarations)) {
        const value = match[2].trim().replace(/url\([^)]*\)/g, "");
        const named = [...value.matchAll(/(?<![\w-])[a-z]+(?![\w-])/gi)].some(word => cssNames.has(word[0].toLowerCase()));
        if (hex.test(value) || colorFunction.test(value) || /(?:linear|radial|conic)-gradient\(|\b(?:brightness|hue-rotate|saturate)\(/.test(value)
            || named) {
            findings.push({ line: clean.slice(0, match.index).split("\n").length, message: "Use colour variables or a generated recipe in CSS." });
        }
    }
    return findings;
}

export function normalizedHex(value) {
    const lower = value.toLowerCase();
    if (lower === "white") return "#ffffff";
    if (lower === "black") return "#000000";
    return /^#[\da-f]{3}$/.test(lower) ? "#" + [...lower.slice(1)].map(char => char + char).join("") : lower;
}

export function checkSvgColors(source, allowed = approvedColors()) {
    const findings = [];
    for (const match of source.matchAll(/\b(?:fill|stroke|stop-color|flood-color)\s*=\s*["']([^"']+)["']/gi)) {
        const value = match[1];
        if (!inherited.has(value) && !value.startsWith("url(#") && !allowed.has(normalizedHex(value))) findings.push({ line: source.slice(0, match.index).split("\n").length, message: `SVG colour ${value} is not in the palette.` });
    }
    for (const match of source.matchAll(/\b(?:color|background(?:-color)?|fill|stroke|stop-color)\s*:\s*([^;"'}]+)/gi)) {
        const value = match[1].trim();
        if (!inherited.has(value) && !value.startsWith("url(#") && !allowed.has(normalizedHex(value))) findings.push({ line: source.slice(0, match.index).split("\n").length, message: `SVG style colour ${value} is not in the palette.` });
    }
    return findings;
}

export function approvedColors(value = palette) {
    return new Set(["ui", "pathway", "mascot", "chart", "categorical"].flatMap(group => Object.values(value[group]).flat()).map(normalizedHex));
}

export function contrastRatio(first, second) {
    const luminance = color => {
        const rgb = normalizedHex(color).slice(1, 7).match(/../g).map(channel => parseInt(channel, 16) / 255)
            .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function isPurple(color) {
    const rgb = normalizedHex(color).slice(1, 7).match(/../g).map(channel => parseInt(channel, 16) / 255);
    const max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min;
    if (delta < 0.02 || delta / (1 - Math.abs(max + min - 1)) <= 0.08) return false;
    const hue = ((max === rgb[0] ? (rgb[1] - rgb[2]) / delta : max === rgb[1] ? (rgb[2] - rgb[0]) / delta + 2 : (rgb[0] - rgb[1]) / delta + 4) * 60 + 360) % 360;
    return hue >= 230 && hue <= 345;
}

function files(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}

export function checkColors(root = fileURLToPath(new URL("../", import.meta.url))) {
    const failures = checkGeneratedColors().map(file => `${file}: generated colours are stale; run npm run colors:generate.`);
    for (const color of approvedColors()) {
        if (!/^#[\da-f]{6}(?:[\da-f]{2})?$/.test(color)) failures.push(`Invalid sRGB palette value: ${color}`);
        if (isPurple(color)) failures.push(`Purple is not permitted: ${color}`);
    }
    for (const [foreground, background] of palette.contrastPairs) {
        const ratio = contrastRatio(palette.ui[foreground], palette.ui[background]);
        if (ratio < 4.5) failures.push(`${foreground} on ${background}: ${ratio.toFixed(2)}:1 (requires 4.5:1).`);
    }
    for (const background of ["surface", "surfaceSubtle", "surfaceRecessed", "selection"]) {
        for (const role of ["ring", "controlBorder"]) if (contrastRatio(palette.ui[role], palette.ui[background]) < 3) failures.push(`${role} does not reach 3:1 on ${background}.`);
    }
    if (contrastRatio(palette.ui.rewardOutline, palette.ui.rewardTrack) < 3) failures.push("XP meter outline does not reach 3:1 against its track.");
    for (const role of ["current", "proposal", "fitted", "error"]) {
        for (const surface of ["surface", "surfaceSubtle"]) if (contrastRatio(palette.chart[role], palette.ui[surface]) < 3) failures.push(`Chart ${role} does not reach 3:1 against ${surface}.`);
    }
    const generated = new Set(["src/theme/colors.ts", "src/theme/colors.generated.css"]);
    for (const file of [...files(path.join(root, "src")), ...files(path.join(root, "public"))]) {
        const relative = path.relative(root, file).replaceAll("\\", "/");
        if (generated.has(relative)) continue;
        if (!/\.(?:[cm]?[jt]sx?|css|svg)$/.test(file)) continue;
        const source = readFileSync(file, "utf8");
        const found = /\.[cm]?[jt]sx?$/.test(file) ? checkSourceColors(source, file) : file.endsWith(".css") ? checkCssColors(source) : file.endsWith(".svg") ? checkSvgColors(source) : [];
        failures.push(...found.map(finding => `${relative}:${finding.line}: ${finding.message}`));
    }
    return failures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const failures = checkColors();
    if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
    else console.log("Colour guide checks passed: generated tokens, source rules, SVG palette and contrast pairs.");
}
