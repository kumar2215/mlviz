import { readFileSync, writeFileSync } from "node:fs";
import { allowedMilestones, stepIds } from "../src/lib/storyProgress.ts";
import { loadProgressCatalog } from "./progress-catalog.mjs";

const target = new URL("../firestore.rules", import.meta.url);
const start = "    // BEGIN GENERATED STORY CATALOG";
const end = "    // END GENERATED STORY CATALOG";
const branches = loadProgressCatalog().map(story => {
    const allowed = allowedMilestones(story);
    const pages = story.pages.map(page => page.id).filter(Boolean);
    const steps = ["", ...new Set(story.pages.flatMap(stepIds))];
    return `        (storyId == '${story.name}'\n          && data.milestones.size() <= ${allowed.length}\n          && data.milestones.hasOnly(${JSON.stringify(allowed)})\n          && data.checkpoint.page in ${JSON.stringify(pages)}\n          && data.checkpoint.step in ${JSON.stringify(steps)})`;
});
const block = `${start}\n    // Task/page IDs are the allowlist, not proof of learning. XP is private and client-reported.\n    // Keep IDs stable; retain retired tasks with xp: 0 if historic completions must still sync.\n    function isKnownStoryProgress(data, storyId) {\n      return ${branches.join("\n        || ")};\n    }\n${end}`;
const source = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
const begin = source.indexOf(start), finish = source.indexOf(end);
if (begin < 0 || finish < begin) throw new Error("Missing generated catalog markers in firestore.rules");
const generated = source.slice(0, begin) + block + source.slice(finish + end.length);
if (process.argv.includes("--check")) {
    if (source !== generated) throw new Error("Firestore progress catalog is stale. Run npm run generate:progress-rules, then validate and deploy the rules.");
} else writeFileSync(target, generated);
