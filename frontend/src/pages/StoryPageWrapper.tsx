import VisualisationPage from "./VisualisationPage";
import { useStory, setCurrentStory } from "@/store/useStory";
import { useVisualisation } from "@/store/useVisualisation";
import { useEffect } from "react";
import type { Transition } from "@/types/visualisation";
import type { PageUnion } from "@/types/page";
import type { Story } from "@/types/story";

export default function StoryPageWrapper({ story }: { story: Story }) {
    const { stories } = useStory();

    function unrollStory(story: Story): Story {
        if (story.pages.filter((page) => page.page_type === "reference").length === 0) {
            return story; // No references, return as is
        }
        let pages: PageUnion[] = [];
        let transitions: Transition[] = story.transitions;

        for (const page of story.pages) {
            if (page.page_type !== "reference") {
                pages.push(page);
            } else {
                const referenceType = page.reference_type;
                if (referenceType === "story") {
                    const referencedStoryName = page.path;
                    const referencedStory = stories[referencedStoryName];
                    if (!referencedStory) {
                        throw new Error(`Referenced story not found: ${referencedStoryName}`);
                    }
                    const unrolledReferencedStory = unrollStory(referencedStory);
                    const referencePages = page.pages;

                    for (const index of referencePages) {
                        const referencePage = unrolledReferencedStory.pages[index];
                        pages.push(referencePage);
                    }

                    const pageOffset = pages.length - referencePages.length;
                    for (let i1 = 0; i1 < referencePages.length; i1++) {
                        for (let i2 = 0; i2 < referencePages.length; i2++) {
                            if (i1 !== i2) {
                                const local_idx1 = referencePages[i1];
                                const local_idx2 = referencePages[i2];
                                const t1 = unrolledReferencedStory.transitions.find(
                                    (t) => t.from === local_idx1 && t.to === local_idx2,
                                );
                                const t2 = unrolledReferencedStory.transitions.find(
                                    (t) => t.from === local_idx2 && t.to === local_idx1,
                                );
                                if (t1) transitions.push({ ...t1, from: pageOffset + i1, to: pageOffset + i2 });
                                if (t2) transitions.push({ ...t2, from: pageOffset + i2, to: pageOffset + i1 });
                            }
                        }
                    }
                } else if (referenceType === "visualisation") {
                    const visualisationCategory = page.path.split("/")[0];
                    const visualisationName = page.path.split("/")[1].replace(".json", "");
                    const referenceVisualisation = Object.values(useVisualisation.getState().visualisations).find(
                        (v) => v.category === visualisationCategory && v.name === visualisationName,
                    );
                    if (!referenceVisualisation) {
                        throw new Error(`Referenced visualisation not found: ${visualisationName}`);
                    }
                    const unrolledReferenceVisualisation = unrollStory(referenceVisualisation);
                    const referencePages = page.pages;

                    for (const index of referencePages) {
                        const referencePage = { ...unrolledReferenceVisualisation.pages[index] };
                        if (referencePage.page_type === "dynamic") {
                            referencePage.category = visualisationCategory;
                            referencePage.path = visualisationName;
                        }
                        pages.push(referencePage);
                    }

                    const pageOffset = pages.length - referencePages.length;
                    for (let i1 = 0; i1 < referencePages.length; i1++) {
                        for (let i2 = 0; i2 < referencePages.length; i2++) {
                            if (i1 !== i2) {
                                const local_idx1 = referencePages[i1];
                                const local_idx2 = referencePages[i2];
                                const t1 = unrolledReferenceVisualisation.transitions.find(
                                    (t) => t.from === local_idx1 && t.to === local_idx2,
                                );
                                const t2 = unrolledReferenceVisualisation.transitions.find(
                                    (t) => t.from === local_idx2 && t.to === local_idx1,
                                );
                                if (t1) transitions.push({ ...t1, from: pageOffset + i1, to: pageOffset + i2 });
                                if (t2) transitions.push({ ...t2, from: pageOffset + i2, to: pageOffset + i1 });
                            }
                        }
                    }
                } else {
                    throw new Error(`Unknown reference type: ${referenceType}`);
                }
            }
        }
        return { ...story, pages, transitions };
    }

    useEffect(() => {
        const unrolledStory = unrollStory(story);
        setCurrentStory(unrolledStory);
    }, [story]);

    return <VisualisationPage userMode="story" />;
};
