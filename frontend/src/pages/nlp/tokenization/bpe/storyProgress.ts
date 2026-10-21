import type { BpeCountAnswer, BpePair } from "@/api/bpe";

export interface StoryProgress {
    round: number;
    stage: "count" | "merge" | "complete";
}

type ProgressEvent = { type: "counts_checked" | "merge_checked"; correct: boolean } | { type: "edit_counts" };

export const initialStoryProgress = (): StoryProgress => ({ round: 0, stage: "count" });
export const pairKey = (pair: BpePair) => JSON.stringify([pair.left, pair.right]);

export function readCountAnswers(pairs: BpePair[], drafts: Record<string, string>): BpeCountAnswer[] | null {
    if (!pairs.length) return null;
    const answers: BpeCountAnswer[] = [];
    for (const pair of pairs) {
        const value = drafts[pairKey(pair)];
        if (value === undefined || !value.trim()) return null;
        const count = Number(value);
        if (!Number.isSafeInteger(count) || count < 0) return null;
        answers.push({ ...pair, count });
    }
    return answers;
}

export function advanceStoryProgress(progress: StoryProgress, event: ProgressEvent, rounds: number): StoryProgress {
    if (progress.stage === "complete" || rounds < 1 || progress.round >= rounds) return progress;
    if (event.type === "edit_counts") return progress.stage === "merge" ? { ...progress, stage: "count" } : progress;
    if (!event.correct) return progress;
    if (event.type === "counts_checked" && progress.stage === "count") return { ...progress, stage: "merge" };
    if (event.type === "merge_checked" && progress.stage === "merge") {
        const round = progress.round + 1;
        return { round, stage: round === rounds ? "complete" : "count" };
    }
    return progress;
}
