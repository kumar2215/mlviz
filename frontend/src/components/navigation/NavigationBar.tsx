import { ClipboardList, Route } from "lucide-react";
import { useId, useRef } from "react";
import PathwayGraph from "./PathwayGraph";
import { LearningSaveStatus } from "@/components/layout/LearningProgress";
import { useStory } from "@/store/useStory";
import { usePathway } from "@/store/usePathway";
import type { NavigationTab } from "@/store/pathwayStore";
import TaskRewards from "@/components/layout/TaskRewards";

const tabs = [
    { id: "pathway", label: "Pathway", Icon: Route },
    { id: "tasks", label: "Tasks", Icon: ClipboardList },
] as const;

export default function NavigationBar() {
    const storyMode = useStory(state => state.currentStory !== null);
    const activeTab = usePathway(state => state.navigationTab);
    const setTab = usePathway(state => state.setNavigationTab);
    const id = useId();
    const tabRefs = useRef<Partial<Record<NavigationTab, HTMLButtonElement | null>>>({});
    return (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 p-3">
            <div role="tablist" aria-label="Activity navigation" className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-blue-100 bg-blue-50 p-1">
                {tabs.map(({ id: tab, label, Icon }, index) => <button key={tab} ref={element => { tabRefs.current[tab] = element; }} type="button" role="tab" id={`${id}-${tab}-tab`} aria-controls={`${id}-${tab}-panel`} aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1}
                    onClick={() => setTab(tab)}
                    onKeyDown={event => {
                        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                        event.preventDefault();
                        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                        setTab(tabs[next].id);
                        tabRefs.current[tabs[next].id]?.focus();
                    }}
                    className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:bg-white/60 hover:text-blue-700"}`}>
                    <Icon aria-hidden="true" className="size-4 shrink-0" />{label}
                </button>)}
            </div>
            <div role="tabpanel" id={`${id}-pathway-panel`} aria-labelledby={`${id}-pathway-tab`} hidden={activeTab !== "pathway"} tabIndex={0} className={`min-h-0 flex-1 flex-col focus-visible:outline-2 focus-visible:outline-blue-600 ${activeTab === "pathway" ? "flex" : "hidden"}`}>
                {activeTab === "pathway" && <PathwayGraph />}
            </div>
            <div role="tabpanel" id={`${id}-tasks-panel`} aria-labelledby={`${id}-tasks-tab`} hidden={activeTab !== "tasks"} tabIndex={0} className={`min-h-0 flex-1 overflow-y-auto focus-visible:outline-2 focus-visible:outline-blue-600 ${activeTab === "tasks" ? "block" : "hidden"}`}>
                {activeTab === "tasks" && <TaskRewards />}
            </div>
            {storyMode && <LearningSaveStatus className="shrink-0" />}
        </div>
    );
}
