import { CheckCircle2, Sparkles } from "lucide-react";
import type { PageUnion } from "@/types/page";
import { pageTasks, stepIds, taskKey } from "@/lib/storyProgress";
import { useProgress } from "@/store/useProgress";
import { activeBucket } from "@/store/progressStore";
import { usePathway } from "@/store/usePathway";

export function RewardLabel({ storyId, page, step }: { storyId: string; page: PageUnion; step?: string }) {
    const progress = useProgress(state => activeBucket(state).stories[storyId]);
    const tasks = pageTasks(page).filter(task => step === undefined || task.subpage_id === step);
    const earned = tasks.filter(task => progress?.milestones.includes(taskKey(page.id!, task.id))).reduce((sum, task) => sum + task.xp, 0);
    const total = tasks.reduce((sum, task) => sum + task.xp, 0);
    return <span>{total ? `${earned} / ${total} XP earned${earned === total ? " · Earned" : ""}` : "Explore · 0 XP"}</span>;
}

export default function TaskRewards({ storyId, page }: { storyId: string; page: PageUnion }) {
    const index = usePathway(state => state.subpageIndex);
    const progress = useProgress(state => activeBucket(state).stories[storyId]);
    const step = stepIds(page)[index];
    const tasks = pageTasks(page).filter(task => task.xp > 0 && (!task.subpage_id || task.subpage_id === step));
    return <section aria-label="Activity XP rewards" className="flex max-h-32 shrink-0 flex-wrap items-center gap-2 overflow-y-auto border-b border-amber-100 bg-white/90 px-4 py-2">
        {tasks.length ? tasks.map(task => {
            const earned = progress?.milestones.includes(taskKey(page.id!, task.id));
            const Icon = earned ? CheckCircle2 : Sparkles;
            return <span key={task.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${earned ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}><Icon aria-hidden="true" className="size-3.5" /><strong>{earned ? "Earned · " : "+"}{task.xp} XP</strong><span>{task.label}</span></span>;
        }) : <p className="text-xs text-slate-500">Explore and learn · 0 XP for this activity</p>}
    </section>;
}
