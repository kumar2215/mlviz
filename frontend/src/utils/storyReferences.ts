import type { PageUnion } from "../types/page.ts";
import type Story from "../types/story.ts";
import type { Transition } from "../types/story.ts";
import type Visualisation from "../types/visualisation.ts";

export interface StoryCatalog {
    stories: Record<string, Story>;
    visualisations: Record<string, Visualisation>;
}

function processUnrolledStory(story: Story, referencePages: number[], pageOffset: number, transitions: Transition[]): void {
    for (const transition of story.transitions) {
        const from = referencePages.indexOf(transition.from);
        const to = referencePages.indexOf(transition.to);
        if (from !== -1 && to !== -1) {
            transitions.push({ ...transition, from: pageOffset + from, to: pageOffset + to });
        }
    }
}

export function unrollStory(story: Story, catalog: StoryCatalog, activeStories: ReadonlySet<Story> = new Set()): Story {
    if (activeStories.has(story)) {
        const referenceChain = [...activeStories, story].map((entry) => entry.name).join(" -> ");
        throw new Error(`Circular story reference: ${referenceChain}`);
    }
    // Each branch gets its own ancestors so shared references remain valid.
    const nextActiveStories = new Set(activeStories);
    nextActiveStories.add(story);

    const { stories, visualisations } = catalog;
    if (story.pages.every((page) => page.page_type !== "reference" && !(page.page_type === "mixed" && page.dynamic_page.page_type === "reference"))) {
        return story; // No references, return as is
    }
    const pages: PageUnion[] = [];
    const transitions: Transition[] = [...story.transitions];
    const mixedVisualPages = new Map<string, { story: Story; indices: Map<number, number> }>();

    for (const page of story.pages) {
        if (page.page_type === "mixed" && page.dynamic_page.page_type === "reference") {
            const reference = page.dynamic_page;
            if (reference.reference_type !== "visualisation" || reference.pages.length !== 1) {
                throw new Error("A mixed page must reference exactly one visualisation page");
            }
            const [category, file] = reference.path.split("/");
            const visualisationName = file?.replace(".json", "");
            const visualisation = Object.values(visualisations).find(
                (entry) => entry.category === category && entry.name === visualisationName,
            );
            if (!visualisation) {
                throw new Error(`Referenced visualisation not found: ${reference.path}`);
            }
            const resolvedVisualisation = unrollStory(visualisation, catalog, nextActiveStories);
            const referencedPage = resolvedVisualisation.pages[reference.pages[0]];
            if (!referencedPage || referencedPage.page_type !== "dynamic") {
                throw new Error(`Referenced page is not dynamic: ${reference.path}#${reference.pages[0]}`);
            }
            pages.push({
                ...page,
                dynamic_page: { ...referencedPage, category, path: visualisationName },
            });
            const group = mixedVisualPages.get(reference.path) ?? { story: resolvedVisualisation, indices: new Map<number, number>() };
            group.indices.set(reference.pages[0], pages.length - 1);
            mixedVisualPages.set(reference.path, group);
        } else if (page.page_type !== "reference") {
            pages.push(page);
        } else {
            const referenceType = page.reference_type;
            if (referenceType === "story") {
                const referencedStoryName = page.path;
                const referencedStory = stories[referencedStoryName];
                if (!referencedStory) {
                    throw new Error(`Referenced story not found: ${referencedStoryName}`);
                }
                const unrolledReferencedStory = unrollStory(referencedStory, catalog, nextActiveStories);
                const referencePages = page.pages;

                for (const index of referencePages) {
                    const referencePage = unrolledReferencedStory.pages[index];
                    if (page.id && referencePages.length > 1 && (!referencePage?.id || page.xp_tasks)) throw new Error("Multi-page progress references need stable source page IDs and per-page rewards at the source");
                    pages.push({ ...referencePage, id: page.id ? referencePages.length === 1 ? page.id : `${page.id}-${referencePage.id}` : referencePage.id, ...(page.xp_tasks ? { xp_tasks: page.xp_tasks } : {}) });
                }

                const pageOffset = pages.length - referencePages.length;
                processUnrolledStory(unrolledReferencedStory, referencePages, pageOffset, transitions);
            } else if (referenceType === "visualisation") {
                const visualisationCategory = page.path.split("/")[0];
                const visualisationName = page.path.split("/")[1].replace(".json", "");
                const referenceVisualisation = Object.values(visualisations).find(
                    (v) => v.category === visualisationCategory && v.name === visualisationName,
                );
                if (!referenceVisualisation) {
                    throw new Error(`Referenced visualisation not found: ${visualisationName}`);
                }
                const unrolledReferenceVisualisation = unrollStory(referenceVisualisation, catalog, nextActiveStories);
                const referencePages = page.pages;

                for (const index of referencePages) {
                    const referencePage = { ...unrolledReferenceVisualisation.pages[index] };
                    if (page.id && referencePages.length > 1 && (!referencePage.id || page.xp_tasks)) throw new Error("Multi-page progress references need stable source page IDs and per-page rewards at the source");
                    if (page.id) referencePage.id = referencePages.length === 1 ? page.id : `${page.id}-${referencePage.id}`;
                    if (page.xp_tasks) referencePage.xp_tasks = page.xp_tasks;
                    if (referencePage.page_type === "dynamic") {
                        referencePage.category = visualisationCategory;
                        referencePage.path = visualisationName;
                    }
                    pages.push(referencePage);
                }

                const pageOffset = pages.length - referencePages.length;
                processUnrolledStory(unrolledReferenceVisualisation, referencePages, pageOffset, transitions);
            } else {
                throw new Error(`Unknown reference type: ${referenceType}`);
            }
        }
    }
    for (const { story: visualisation, indices } of mixedVisualPages.values()) {
        for (const transition of visualisation.transitions) {
            const from = indices.get(transition.from);
            const to = indices.get(transition.to);
            if (from !== undefined && to !== undefined) {
                transitions.push({ ...transition, from, to });
            }
        }
    }
    return { ...story, pages, transitions };
}

