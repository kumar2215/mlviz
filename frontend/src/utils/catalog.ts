import type Config from "../types/config.ts";
import type Story from "../types/story.ts";
import type Visualisation from "../types/visualisation.ts";

export function configuredStories(config: Config | null, stories: Record<string, Story>): Story[] {
    return (config?.stories ?? []).flatMap(name => stories[name] ? [stories[name]] : []);
}

export function configuredVisualisations(
    config: Config | null,
    visualisations: Record<string, Visualisation>,
    category: string | undefined,
): Visualisation[] {
    const files = config?.categories.find(entry => entry.config_path === category)?.files ?? [];
    return files.flatMap(file => {
        const visualisation = visualisations[file.replace(/\.json$/, "")];
        return visualisation?.category === category ? [visualisation] : [];
    });
}
