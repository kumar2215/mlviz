import { CheckCircle2, Sparkles } from "lucide-react";
import type { PageUnion } from "@/types/page";
import { pageTasks, stepIds, taskKey } from "@/lib/storyProgress";
import { useProgress } from "@/store/useProgress";
import { activeBucket } from "@/store/progressStore";
import { usePathway } from "@/store/usePathway";
import { useStory } from "@/store/useStory";
import { getDynamicPage, pageTitle } from "@/components/navigation/pathwayModel";

export function RewardLabel({ storyId, page, step }: { storyId: string; page: PageUnion; step?: string }) {
    const progress = useProgress(state => activeBucket(state).stories[storyId]);
    const tasks = pageTasks(page).filter(task => step === undefined || task.subpage_id === step);
    const earned = tasks.filter(task => progress?.milestones.includes(taskKey(page.id!, task.id))).reduce((sum, task) => sum + task.xp, 0);
    const total = tasks.reduce((sum, task) => sum + task.xp, 0);
    return <span>{total ? `${earned} / ${total} XP earned${earned === total ? " · Earned" : ""}` : "Explore · 0 XP"}</span>;
}

export default function TaskRewards() {
    const storyId = useStory(state => state.currentStory?.name);
    const page = usePathway(state => state.pages[state.currentPageId]);
    const pageIndex = usePathway(state => state.currentPageId);
    const index = usePathway(state => state.subpageIndex);
    const progress = useProgress(state => storyId ? activeBucket(state).stories[storyId] : undefined);
    const tasks = page ? pageTasks(page) : [];
    const steps = page ? stepIds(page) : [];
    const labels = getDynamicPage(page)?.subpages ?? [];
    return <section aria-label="Page tasks" className="space-y-3">
        {page && <h2 className="text-sm font-semibold text-slate-800">{pageTitle(page, pageIndex)}</h2>}
        {tasks.length ? <ul className="space-y-2">{tasks.map(task => {
            const earned = Boolean(page?.id && progress?.milestones.includes(taskKey(page.id, task.id)));
            const Icon = earned ? CheckCircle2 : Sparkles;
            const stepIndex = task.subpage_id ? steps.indexOf(task.subpage_id) : -1;
            return <li key={task.id} className={`space-y-2 rounded-xl border p-3 ${earned ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
                <div className="flex items-center gap-1.5 text-xs"><Icon aria-hidden="true" className="size-4 shrink-0" /><strong>{earned ? "Earned · " : "+"}{task.xp} XP</strong></div>
                <p className="text-sm font-medium leading-snug">{task.label}</p>
                {stepIndex >= 0 && <p className="text-xs opacity-80">Step {stepIndex + 1}{labels[stepIndex] ? ` · ${labels[stepIndex]}` : ""}{stepIndex === index ? " · Current step" : ""}</p>}
            </li>;
        })}</ul> : <div className="rounded-xl border border-dashed border-blue-200 bg-white p-4"><p className="text-sm text-slate-500">No tasks for this page.</p></div>}
    </section>;
}
