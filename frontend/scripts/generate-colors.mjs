import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const paletteFile = new URL("../src/theme/palette.json", import.meta.url);
export const palette = JSON.parse(readFileSync(paletteFile, "utf8"));
const kebab = value => value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

export function generatedColors(value = palette) {
    const lines = ["/* Generated from theme/palette.json. Run npm run colors:generate. */", ":root {"];
    for (const group of ["ui", "pathway", "mascot", "chart"]) {
        for (const [name, color] of Object.entries(value[group])) lines.push(`    --${group === "ui" ? "" : `${group}-`}${kebab(name)}: ${color};`);
    }
    const aliases = {
        card: "surface", cardForeground: "foreground", popover: "surface", popoverForeground: "foreground",
        muted: "surfaceRecessed", accent: "selection", accentForeground: "selectionForeground", input: "controlBorder",
        sidebar: "surfaceSubtle", sidebarForeground: "foreground", sidebarPrimary: "primary",
        sidebarPrimaryForeground: "primaryForeground", sidebarAccent: "selection", sidebarAccentForeground: "selectionForeground",
        sidebarBorder: "border", sidebarRing: "ring",
    };
    for (const [alias, target] of Object.entries(aliases)) lines.push(`    --${kebab(alias)}: var(--${kebab(target)});`);
    lines.push("}", "", "@theme inline {");
    for (const group of ["ui", "pathway", "mascot", "chart"]) {
        for (const name of Object.keys(value[group])) {
            const token = `${group === "ui" ? "" : `${group}-`}${kebab(name)}`;
            lines.push(`    --color-${token}: var(--${token});`);
        }
    }
    for (const alias of Object.keys(aliases)) lines.push(`    --color-${kebab(alias)}: var(--${kebab(alias)});`);
    lines.push("}", "", "@utility bg-page { background-image: linear-gradient(to bottom right, var(--page-start), var(--page-end)); }",
        "@utility bg-brand-gradient { background-image: linear-gradient(to right, var(--brand), var(--brand-cyan)); }",
        "@utility reward-meter { background-color: var(--reward-meter); box-shadow: inset 0 0 0 1px var(--reward-outline); }",
        "@utility shadow-xs { box-shadow: 0 1px 2px var(--shadow); }",
        "@utility shadow-sm { box-shadow: 0 1px 3px var(--shadow); }",
        "@utility shadow-md { box-shadow: 0 4px 8px var(--shadow); }",
        "@utility shadow-lg { box-shadow: 0 8px 16px var(--shadow-strong); }",
        "@utility shadow-xl { box-shadow: 0 12px 24px var(--shadow-strong); }",
        "@utility shadow-2xl { box-shadow: 0 20px 40px var(--shadow-strong); }");
    for (const [name, opacity] of Object.entries(value.opacity)) lines.push(`@utility opacity-${name} { opacity: ${opacity}; }`);
    const ts = "// Generated from palette.json. Run npm run colors:generate.\n"
        + ["ui", "pathway", "mascot", "chart"].map(group => `export const ${group}Colors = ${JSON.stringify(value[group], null, 4)} as const;`).join("\n\n")
        + `\n\nexport const categoricalPalettes = ${JSON.stringify(value.categorical, null, 4)} as const;\n`
        + `export const continuousSchemes = ${JSON.stringify(value.continuous, null, 4)} as const;\n`
        + `export const opacity = ${JSON.stringify(value.opacity, null, 4)} as const;\n`
        + "export type UiColorRole = keyof typeof uiColors;\nexport type ChartColorRole = keyof typeof chartColors;\n";
    return new Map([[new URL("../src/theme/colors.generated.css", import.meta.url), lines.join("\n") + "\n"],
        [new URL("../src/theme/colors.ts", import.meta.url), ts]]);
}

export function checkGeneratedColors(read = readFileSync) {
    return [...generatedColors()].filter(([path, expected]) => {
        try { return read(path, "utf8").replace(/\r\n/g, "\n") !== expected; } catch { return true; }
    }).map(([path]) => fileURLToPath(path));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    if (process.argv.includes("--check")) {
        const stale = checkGeneratedColors();
        if (stale.length) throw new Error(`Generated colours are stale: ${stale.join(", ")}. Run npm run colors:generate.`);
    } else {
        for (const [path, content] of generatedColors()) writeFileSync(path, content);
    }
}
