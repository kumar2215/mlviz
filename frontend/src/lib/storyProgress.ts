import type Story from "../types/story.ts";
import type { PageUnion, XpTask } from "../types/page.ts";

export interface Checkpoint { page: string; step: string; at: number; client: string }
export interface StoryProgress { version: 1; milestones: string[]; checkpoint: Checkpoint }
export interface ProgressBucket { stories: Record<string, StoryProgress>; pending: string[] }
export const emptyBucket = (): ProgressBucket => ({ stories: {}, pending: [] });
export const emptyProgress = (): StoryProgress => ({ version: 1, milestones: [], checkpoint: { page: "", step: "", at: 0, client: "" } });
export const stableId = (id: unknown): id is string => typeof id === "string" && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(id);
export const dynamicPage = (page: PageUnion) => page.page_type === "dynamic" ? page : page.page_type === "mixed" && page.dynamic_page.page_type === "dynamic" ? page.dynamic_page : null;
export const pageTasks = (page: PageUnion): XpTask[] => page.xp_tasks ?? dynamicPage(page)?.xp_tasks ?? [];
export const stepIds = (page: PageUnion): string[] => dynamicPage(page)?.subpage_ids ?? [];
export const taskKey = (page: string, task: string) => `task:${page}:${task}`;
export const stepKey = (page: string, step: string) => `step:${page}:${step}`;

function checkpointKey(value: Checkpoint): string { return [value.client, value.page, value.step].join(":"); }
export function mergeProgress(a: StoryProgress | undefined, b: StoryProgress | undefined): StoryProgress {
    if (!a) return b ?? emptyProgress();
    if (!b) return a;
    const checkpoint = a.checkpoint.at > b.checkpoint.at || a.checkpoint.at === b.checkpoint.at && checkpointKey(a.checkpoint) >= checkpointKey(b.checkpoint) ? a.checkpoint : b.checkpoint;
    return { version: 1, milestones: [...new Set([...a.milestones, ...b.milestones])].sort(), checkpoint };
}
export function sameProgress(a: StoryProgress | undefined, b: StoryProgress | undefined): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
export function readProgress(input: unknown): StoryProgress | null {
    if (!input || typeof input !== "object") return null;
    const value = input as Partial<StoryProgress>;
    if (value.version !== 1 || !Array.isArray(value.milestones) || value.milestones.length > 512
        || !value.milestones.every(id => typeof id === "string" && id.length <= 250 && /^[a-z0-9:_-]+$/.test(id))) return null;
    const cp = value.checkpoint;
    if (!cp || typeof cp !== "object" || !(cp.page === "" || stableId(cp.page)) || !(cp.step === "" || stableId(cp.step))
        || typeof cp.client !== "string" || !/^[a-zA-Z0-9-]{0,80}$/.test(cp.client) || !Number.isSafeInteger(cp.at) || cp.at < 0 || cp.at > 8640000000000000) return null;
    return { version: 1, milestones: [...new Set(value.milestones)].sort(), checkpoint: { page: cp.page, step: cp.step, at: cp.at, client: cp.client } };
}

export function validateStoryProgressConfig(story: Story): void {
    const ids = new Set<string>();
    for (const page of story.pages) {
        // Older, unscored catalog entries remain usable without persistence.
        if (page.id !== undefined && (!stableId(page.id) || ids.has(page.id))) throw new Error(`Invalid or duplicate page ID in ${story.name}: ${page.id}`);
        if (page.id) ids.add(page.id);
        const tasks = pageTasks(page);
        if (tasks.length && !page.id) throw new Error(`XP tasks need a stable page ID in ${story.name}`);
        const steps = stepIds(page);
        const labels = dynamicPage(page)?.subpages ?? [];
        if (steps.length && (steps.length !== labels.length || new Set(steps).size !== steps.length || !steps.every(stableId))) throw new Error(`Invalid subpage IDs in ${story.name}/${page.id}`);
        const taskIds = new Set<string>();
        for (const task of tasks) {
            if (!stableId(task.id) || taskIds.has(task.id) || !Number.isSafeInteger(task.xp) || task.xp < 0 || task.xp > 100000
                || typeof task.label !== "string" || !task.label.trim() || task.label.length > 150 || task.subpage_id !== undefined && !steps.includes(task.subpage_id)) throw new Error(`Invalid XP task in ${story.name}/${page.id}: ${task.id}`);
            taskIds.add(task.id);
        }
    }
}

export function storyXp(story: Story, progress: StoryProgress | undefined) {
    let earned = 0, total = 0, completed = 0, tasks = 0;
    for (const page of story.pages) for (const task of pageTasks(page)) {
        total += task.xp;
        if (task.xp > 0) tasks++;
        if (progress?.milestones.includes(taskKey(page.id!, task.id))) { earned += task.xp; if (task.xp > 0) completed++; }
    }
    return { earned, total, completed, tasks };
}
export function levelProgress(xp: number, perLevel = 100) {
    const step = Number.isSafeInteger(perLevel) && perLevel > 0 ? perLevel : 100;
    return { level: 1 + Math.floor(xp / step), current: xp % step, required: step };
}
export function allowedMilestones(story: Story): string[] {
    return story.pages.flatMap(page => !page.id ? [] : [
        `visit:${page.id}`, `unlock:${page.id}`, `complete:${page.id}`,
        ...stepIds(page).map(step => stepKey(page.id!, step)), ...pageTasks(page).map(task => taskKey(page.id!, task.id)),
    ]).sort();
}
