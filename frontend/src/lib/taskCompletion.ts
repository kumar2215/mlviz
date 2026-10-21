import type Story from "../types/story.ts";
import type { PathwayStore, PageProgressContext } from "../store/pathwayStore.ts";
import { activeBucket, type ProgressStore } from "../store/progressStore.ts";
import { levelProgress, pageTasks, stepIds, storyXp, taskKey } from "./storyProgress.ts";

export function createTaskCompletion(pathway: PathwayStore, progress: ProgressStore, story: Story, context: PageProgressContext,
    epoch: number, catalog: Record<string, Story>, perLevel = 100) {
    return (taskId: string) => {
        const state = pathway.getState();
        const learner = progress.getState();
        if (learner.epoch !== epoch || state.sessionId !== context.sessionId || state.replayKey !== context.replayKey
            || state.currentPageId !== context.pageId || state.subpageIndex !== context.subpageIndex) return;
        const page = state.pages[context.pageId];
        const task = page && pageTasks(page).find(task => task.id === taskId);
        if (!page?.id || !task || task.subpage_id && task.subpage_id !== stepIds(page)[state.subpageIndex]) return;
        const key = taskKey(page.id, task.id);
        if (activeBucket(learner).stories[story.name]?.milestones.includes(key)) return;
        const before = Object.values(catalog).reduce((sum, entry) => sum + storyXp(entry, activeBucket(learner).stories[entry.name]).earned, 0);
        if (!learner.update(story.name, [key], page.id, stepIds(page)[state.subpageIndex] ?? "", epoch)) return;
        if (task.xp > 0) {
            const previous = levelProgress(before, perLevel).level;
            const next = levelProgress(before + task.xp, perLevel).level;
            learner.announce(`+${task.xp} XP · ${task.label}${next > previous ? ` · Level ${next} reached!` : ""}`);
        }
    };
}
