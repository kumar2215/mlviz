import { pathwayColors } from "../../theme/colors";
import { RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { segmentState, selectSubpage, subpageArc, pathwayMarkerPosition, PATHWAY_MARKER_SIZE } from "./pathwayModel";
import { useShallow } from "zustand/react/shallow";
import { usePathway } from "@/store/usePathway";
import { selectPathwayNode } from "@/store/pathwayStore";
import { useStory } from "@/store/useStory";
import { RewardLabel } from "@/components/layout/TaskRewards";
import { stepIds } from "@/lib/storyProgress";

const tooltipClass = "max-w-56 border border-info-border bg-surface text-foreground shadow-lg";

export default function PathwayPageNode({ pageId }: { pageId: number }) {
    const storyId = useStory(state => state.currentStory?.name);
    const page = usePathway(state => state.pages[pageId]);
    const { node, state, title, reason, labels, progress, canAdvance, currentIndex, canReplay } = usePathway(useShallow(state => selectPathwayNode(state, pageId)));
    const { onNavigate, onNavigateSubpage, onMoveFocus, replayPage } = usePathway(useShallow(state => ({
        onNavigate: state.navigatePage, onNavigateSubpage: state.navigateSubpage, onMoveFocus: state.moveFocus, replayPage: state.replayPage,
    })));
    if (!node) return null;
    const active = state === "current";
    const locked = state === "locked";
    const showRing = labels.length > 0 && !locked && (active || Boolean(progress?.completed.length));
    const marker = pathwayMarkerPosition(currentIndex, labels.length);
    const prefix = locked ? "🔒 " : state === "visited" ? "✓ " : "";
    const description = canReplay ? "Replay · restart this activity. Earned XP is kept; repeat attempts earn no additional XP." : reason;
    const activate = () => {
        if (locked) return;
        if (!active) onNavigate(node.id);
        else if (canReplay) replayPage(node.id);
    };

    return <div className="pathway-node absolute size-[80px]" data-replay={canReplay} style={{ left: node.x - 40, top: node.y - 40 }}>
        {showRing && <svg width="80" height="80" viewBox="0 0 80 80" className={`pointer-events-none absolute inset-0 overflow-visible ${active ? "" : "pathway-review-ring"}`} aria-label="Subpage progress">
            {labels.map((label, index) => {
                const segment = segmentState(index, progress, active);
                const completed = Boolean(progress?.completed.includes(index));
                const current = active && index === currentIndex;
                const arc = subpageArc(index, labels.length);
                const next = index === currentIndex + 1;
                const enabled = !locked && selectSubpage(labels.length, progress, index, canAdvance) !== null;
                const detail = completed ? `${current ? "Current subpage · " : ""}Click to review` : next ? enabled ? "Click to continue" : "Complete the current subpage to continue" : current ? "Current subpage" : "Complete earlier subpages first";
                return <Tooltip key={index}>
                    <TooltipTrigger asChild>
                        <g role="button" tabIndex={enabled || next ? 0 : -1} aria-label={`${completed ? "✓ " : !enabled && !current ? "🔒 " : ""}Step ${index + 1}: ${label}. ${detail}`} aria-disabled={!enabled} aria-current={current ? "step" : undefined} data-subpage-arc={index} data-next-subpage={next} data-navigable={enabled} data-ring-segment={index} data-segment-state={segment}
                            className="pathway-subpage" style={{ cursor: enabled ? "pointer" : next ? "not-allowed" : "default" }}
                            onClick={() => { if (enabled) onNavigateSubpage(node.id, index); }}
                            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (enabled) onNavigateSubpage(node.id, index); } }}>
                            <path d={arc} fill="none" stroke="transparent" strokeWidth="14" />
                            <path d={arc} fill="none" stroke={current ? pathwayColors.segmentCurrent : completed ? pathwayColors.segmentCompleted : enabled ? pathwayColors.segmentNext : pathwayColors.segmentFuture} strokeWidth="4" strokeLinecap="round" />
                        </g>
                    </TooltipTrigger>
                    <TooltipContent side="left" sideOffset={12} className={tooltipClass}><p className="text-sm font-semibold">{completed ? "✓ " : !enabled && !current ? "🔒 " : ""}{label}</p><p className="mt-1 text-xs text-muted-foreground">Step {index + 1} of {labels.length} · {detail}</p>{storyId && page && <p className="mt-1 text-xs text-reward-foreground"><RewardLabel storyId={storyId} page={page} step={stepIds(page)[index] ?? ""} /></p>}</TooltipContent>
                </Tooltip>;
            })}
        </svg>}
        <Tooltip>
            <TooltipTrigger asChild>
                <button type="button" data-pathway-node={node.id} data-node-state={state} data-node-replay={canReplay || undefined} aria-current={active ? "step" : undefined} aria-disabled={locked || (active && !canReplay)} aria-label={`${prefix}${canReplay ? "Replay page" : "Page"} ${node.id + 1}: ${title}. ${description}`}
                    onClick={activate} onKeyDown={event => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); onMoveFocus(node.id, event.key); } }}
                    className={`absolute left-[18px] top-[18px] flex size-[44px] items-center justify-center rounded-full border-2 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4 ${active ? "border-pathway-outline bg-pathway-current text-pathway-on-current" : locked ? "border-dashed border-pathway-locked-outline bg-pathway-locked text-pathway-locked-text" : state === "visited" ? "border-pathway-outline bg-pathway-visited text-selection-foreground hover:bg-selection-hover" : "border-pathway-outline bg-pathway-available text-selection-foreground hover:bg-selection-hover"}`}
                    style={{ cursor: locked ? "not-allowed" : active && !canReplay ? "default" : "pointer" }}>
                    <span aria-hidden="true" className={canReplay ? "pathway-node-number" : ""}>{node.id + 1}</span>
                    {canReplay && <RotateCcw aria-hidden="true" className="pathway-node-replay absolute size-[18px]" />}
                </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={12} className={tooltipClass}><p className="text-sm font-semibold">{prefix}{title}</p><p className="mt-1 text-xs text-muted-foreground">{active && canReplay ? "You are here · " : ""}{description}</p>{labels.length > 0 && <p className="mt-1 text-xs text-selection-foreground">{progress?.completed.length || 0} of {labels.length} steps passed{active ? ` · ${labels[currentIndex]}` : ""}</p>}{storyId && page && <p className="mt-1 text-xs text-reward-foreground"><RewardLabel storyId={storyId} page={page} /></p>}</TooltipContent>
        </Tooltip>
        {active && <img src={`${import.meta.env.BASE_URL}images/soccat-marker.svg`} alt="" aria-hidden="true" data-pathway-marker
            className="pointer-events-none absolute z-20 select-none" draggable={false}
            width={PATHWAY_MARKER_SIZE} height={PATHWAY_MARKER_SIZE}
            style={{ left: marker.x - PATHWAY_MARKER_SIZE / 2, top: marker.y - PATHWAY_MARKER_SIZE / 2 }} />}
    </div>;
}
