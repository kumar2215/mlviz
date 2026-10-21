import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LocateFixed } from "lucide-react";
import { displayCondition } from "@/utils/conditions";
import { edgePath, pageTitle, visibleNodes, type Viewport } from "./pathwayModel";
import PathwayPageNode from "./PathwayPageNode";
import { useShallow } from "zustand/react/shallow";
import { usePathway } from "@/store/usePathway";
import { transitionAvailable } from "@/store/pathwayStore";

export default function PathwayGraph() {
    const { pages, layout, currentPageId, traversed, focusRequest } = usePathway(useShallow(state => ({
        pages: state.pages, layout: state.layout, currentPageId: state.currentPageId, traversed: state.traversed,
        focusRequest: state.focusRequest,
    })));
    const availableEdges = usePathway(useShallow(state => state.layout.edges.filter(edge => transitionAvailable(state, edge.transition)).map(edge => edge.id)));
    const availableIds = useMemo(() => new Set(availableEdges), [availableEdges]);
    const titles = useMemo(() => pages.map(pageTitle), [pages]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const markerId = `pathway-arrow-${useId().replace(/:/g, "")}`;
    const [viewport, setViewport] = useState<Viewport>({ top: 0, left: 0, width: 200, height: 300 });
    const measure = useCallback(() => {
        const element = scrollRef.current;
        if (element) setViewport({ top: element.scrollTop, left: element.scrollLeft, width: element.clientWidth, height: element.clientHeight });
    }, []);
    const reveal = useCallback((id: number) => {
        const node = layout.nodes.find(node => node.id === id);
        const element = scrollRef.current;
        if (!node || !element) return;
        element.scrollTo({ top: Math.max(0, node.y - element.clientHeight / 2), left: Math.max(0, node.x - element.clientWidth / 2), behavior: "instant" });
        measure();
    }, [layout, measure]);

    useEffect(() => {
        const observer = new ResizeObserver(measure);
        if (scrollRef.current) observer.observe(scrollRef.current);
        measure();
        return () => observer.disconnect();
    }, [measure]);
    useEffect(() => { reveal(currentPageId); }, [currentPageId, reveal, viewport.width, viewport.height]);

    const windowNodes = visibleNodes(layout.nodes, viewport);
    const windowIds = new Set(windowNodes.map(node => node.id));
    const edges = layout.edges.filter(edge => windowIds.has(edge.from) || windowIds.has(edge.to));
    const scroll = (horizontal: number, vertical: number) => {
        const element = scrollRef.current;
        if (!element) return;
        element.scrollBy({ left: horizontal * element.clientWidth * 0.7, top: vertical * Math.max(104, element.clientHeight * 0.7), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    };
    const scrollButtonClass = "absolute z-10 flex h-7 w-12 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600";
    useEffect(() => {
        if (!focusRequest) return;
        reveal(focusRequest.pageId);
        const frame = requestAnimationFrame(() => scrollRef.current?.querySelector<HTMLButtonElement>(`[data-pathway-node="${focusRequest.pageId}"]`)?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(frame);
    }, [focusRequest, reveal]);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{pages.length} {pages.length === 1 ? "page" : "pages"}</span><button type="button" onClick={() => reveal(currentPageId)} aria-label="Show current page" title="Show current page" className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"><LocateFixed className="size-4" /></button></div>
            <div className="relative flex min-h-32 max-h-96 flex-1 flex-col">
            <div ref={scrollRef} onScroll={measure} role="region" aria-label="Page pathway" tabIndex={0} className="pathway-scroll min-h-0 flex-1 overflow-auto rounded-2xl border border-blue-100 bg-white focus-visible:outline-2 focus-visible:outline-blue-600" data-pathway-viewport>
                <div className="relative" style={{ width: layout.width, minWidth: "100%", height: layout.height }}>
                    <svg width={layout.width} height={layout.height} className="absolute left-0 top-0" aria-hidden="true">
                        <defs><marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
                        {edges.map(edge => {
                            const available = availableIds.has(edge.id);
                            const solid = available || traversed.has(edge.id);
                            return <g key={edge.id}>
                                <path data-pathway-edge={edge.id} data-edge-state={solid ? "available" : "locked"} d={edgePath(edge.points)} fill="none" stroke={available ? "#2563eb" : solid ? "#7dd3fc" : "#cbd5e1"} strokeWidth={available ? 2.5 : 2} strokeDasharray={solid ? undefined : "4 5"} markerEnd={`url(#${markerId})`}><title>{titles[edge.from]} → {titles[edge.to]}: {edge.transition.condition.name || displayCondition(edge.transition.condition)}</title></path>
                            </g>;
                        })}
                    </svg>
                    {windowNodes.map(node => <PathwayPageNode key={node.id} pageId={node.id} />)}
                </div>
            </div>
                {viewport.top > 1 && <button type="button" aria-label="Scroll pathway up" className={`${scrollButtonClass} left-1/2 top-1 -translate-x-1/2`} onClick={() => scroll(0, -1)}><ChevronUp className="size-4" /></button>}
                {viewport.top + viewport.height < layout.height - 1 && <button type="button" aria-label="Scroll pathway down" className={`${scrollButtonClass} bottom-1 left-1/2 -translate-x-1/2`} onClick={() => scroll(0, 1)}><ChevronDown className="size-4" /></button>}
                {viewport.left > 1 && <button type="button" aria-label="Scroll pathway left" className={`${scrollButtonClass} left-1 top-1/2 !h-12 !w-7 -translate-y-1/2`} onClick={() => scroll(-1, 0)}><ChevronLeft className="size-4" /></button>}
                {viewport.left + viewport.width < layout.width - 1 && <button type="button" aria-label="Scroll pathway right" className={`${scrollButtonClass} right-1 top-1/2 !h-12 !w-7 -translate-y-1/2`} onClick={() => scroll(1, 0)}><ChevronRight className="size-4" /></button>}
            </div>
        </div>
    );
}
