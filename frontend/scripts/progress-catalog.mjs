import { readFileSync } from "node:fs";
import { unrollStory } from "../src/utils/storyReferences.ts";
import { validateStoryProgressConfig } from "../src/lib/storyProgress.ts";

export function loadProgressCatalog() {
    const read = path => JSON.parse(readFileSync(new URL(`../public/config/${path}`, import.meta.url), "utf8"));
    const config = read("config.json");
    const visualisations = Object.fromEntries(config.categories.flatMap(category => category.files.map(file => {
        const name = file.replace(/\.json$/, "");
        return [`${category.config_path}/${name}`, { ...read(`visual/${category.config_path}/${file}`), name, category: category.config_path }];
    })));
    const stories = Object.fromEntries(config.stories.map(name => [name, { ...read(`story/${name}.json`), name }]));
    return Object.values(stories).map(story => {
        const resolved = unrollStory(story, { stories, visualisations });
        validateStoryProgressConfig(resolved);
        return resolved;
    });
}
