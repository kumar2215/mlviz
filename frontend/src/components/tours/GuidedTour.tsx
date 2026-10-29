import { Joyride, EVENTS, type TooltipRenderProps } from "react-joyride";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTour } from "@/store/tourStore";
import { usePathway } from "@/store/usePathway";
import useUserMode from "@/hooks/useUserMode";
import { getDynamicPage } from "@/components/navigation/pathwayModel";
import { findTour } from "./tourDefinitions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { tourFloatingOptions } from "./tourPositioning";

function TourTooltip({ index, size, step, tooltipProps, closeProps, backProps, primaryProps, skipProps }: TooltipRenderProps) {
    const action = useTour(state => state.tour?.steps[state.step]?.action);
    const canContinue = useTour(state => state.canContinue);
    const message = useTour(state => state.message);
    const button = "rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
    return <div {...tooltipProps} aria-modal={!action} aria-label="Guided tour" className="max-h-[calc(100dvh-40px)] w-80 max-w-[calc(100vw-40px)] space-y-3 overflow-y-auto rounded-2xl border border-blue-200 bg-white p-4 text-slate-800 shadow-xl">
        <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-blue-700">Guided tour · {index + 1} / {size}</span><button {...closeProps} type="button" onClick={() => useTour.getState().stop()} className={button} aria-label="Close guided tour">×</button></div>
        <h2 className="text-base font-semibold">{step.title}</h2>
        <div className="text-sm leading-relaxed">{step.content}</div>
        {action && <p className="text-xs font-medium text-blue-700">{canContinue ? "This setup is already ready. Next continues without changing it." : "Try the highlighted controls to continue."}</p>}
        {message && <p role="status" className="text-sm text-amber-900">{message}</p>}
        <div className="flex flex-wrap items-center justify-between gap-1"><button {...skipProps} type="button" onClick={() => useTour.getState().stop()} className={`${button} text-slate-500 hover:bg-slate-50`}>Skip tour</button><div className="flex gap-1">
            {index > 0 && <button {...backProps} type="button" onClick={() => useTour.getState().back()} className={`${button} text-blue-700 hover:bg-blue-50`}>Back</button>}
            {(!action || canContinue) && <button {...primaryProps} type="button" onClick={() => useTour.getState().next()} className={`${button} bg-blue-600 text-white hover:bg-blue-700`}>{index === size - 1 ? "Done" : "Next"}</button>}
        </div></div>
    </div>;
}

/** One controller per activity page. Targets and callbacks are scoped to this mounted page. */
export default function GuidedTour() {
    const { userMode, item } = useUserMode();
    const page = usePathway(state => state.pages[state.currentPageId]);
    const pageId = usePathway(state => state.currentPageId);
    const session = usePathway(state => state.sessionId);
    const replay = usePathway(state => state.replayKey);
    const dynamic = getDynamicPage(page);
    const category = "category" in item ? item.category : undefined;
    const tour = findTour(userMode, category, item.name, dynamic?.name);
    const scope = `${session}:${pageId}:${replay}`;
    const boundScope = useTour(state => state.scope);
    const running = useTour(state => state.running);
    const stepIndex = useTour(state => state.step);
    const revision = useTour(state => state.revision);
    const run = useTour(state => state.run);
    const message = useTour(state => state.message);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hostRef = useRef<HTMLSpanElement>(null);
    const [surface, setSurface] = useState<HTMLElement | null>(null);
    const [targetState, setTargetState] = useState({ revision: -1, ready: false });
    const targetReady = targetState.revision === revision && targetState.ready;
    const active = Boolean(tour && boundScope === scope && running);
    const current = tour?.steps[stepIndex];

    useLayoutEffect(() => {
        useTour.getState().bind(scope, tour);
        return () => useTour.getState().unbind(scope);
    }, [scope, tour]);

    useLayoutEffect(() => {
        const root = hostRef.current?.closest("[data-tour-page]");
        if (!root || !tour) { setSurface(null); return; }
        const locate = () => setSurface(root.querySelector<HTMLElement>("[data-tour-surface]"));
        locate();
        const observer = new MutationObserver(locate);
        observer.observe(root, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [scope, tour]);

    useEffect(() => useTour.subscribe((state, previous) => {
        if (previous.running && !state.running && state.scope === scope) {
            requestAnimationFrame(() => { if (useTour.getState().scope === scope && !useTour.getState().running) buttonRef.current?.focus({ preventScroll: true }); });
        }
    }), [scope]);

    useEffect(() => {
        if (!active || !current) return;
        const root = hostRef.current?.closest("[data-tour-page]");
        let missingSince = Date.now();
        let highlighted: Element | null = null;
        let focused = false;
        const check = () => {
            if (!root || useTour.getState().scope !== scope || useTour.getState().revision !== revision) return;
            useTour.getState().skipSetup({
                data: Boolean(root.querySelector('[data-tour-ready="true"]')),
                node: Boolean(root.querySelector('[data-tour="tree-split"]')),
                feature: Boolean(root.querySelector('[data-tour="tree-threshold"]')),
                placing: Boolean(root.querySelector('[data-tour-phase="selecting"]')),
                centroids: Boolean(root.querySelector('[data-tour-centroids="selected"]')),
            });
            if (useTour.getState().revision !== revision) return;
            const element = root.querySelector(`[data-tour="${current.target}"]`);
            const rect = element?.getBoundingClientRect();
            const ready = Boolean(rect?.width && rect.height && element && getComputedStyle(element).visibility !== "hidden");
            setTargetState(previous => previous.revision === revision && previous.ready === ready ? previous : { revision, ready });
            if (highlighted !== element) {
                highlighted?.classList.remove("tour-highlight");
                highlighted = element;
                focused = false;
                if (current.action) highlighted?.classList.add("tour-highlight");
            }
            if (ready && element && current.action && !focused) {
                focused = true;
                const control = element.matches('button, input, select, [tabindex="0"]') ? element as HTMLElement
                    : element.querySelector<HTMLElement>('.node[tabindex="0"], .data-points [tabindex="0"]')
                        ?? element.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]');
                control?.focus({ preventScroll: true });
            }
            if (ready || root.querySelector('[data-tour-content] [role="status"], [data-tour-content] .animate-spin')) missingSince = Date.now();
            else if (Date.now() - missingSince > 15000) useTour.getState().stop("This tour’s controls are not available right now. Finish loading or reopen the controls, then try ? again.");
        };
        check();
        const timer = setInterval(check, 120);
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") useTour.getState().stop();
        };
        document.addEventListener("keydown", escape, true);
        return () => { clearInterval(timer); highlighted?.classList.remove("tour-highlight"); document.removeEventListener("keydown", escape, true); };
    }, [active, current, scope, revision]);

    const steps = useMemo(() => tour?.steps.map(step => ({
        title: step.title, content: step.content,
        target: () => hostRef.current?.closest("[data-tour-page]")?.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) ?? null,
        skipBeacon: true, disableFocusTrap: Boolean(step.action),
        // Interactive targets include portalled selects and SVG controls.
        hideOverlay: Boolean(step.action),
    })) ?? [], [tour]);

    if (!tour) return null;
    return <>
        <span ref={hostRef} hidden />
        {surface && createPortal(<>
        <div data-tour-help className="absolute right-3 top-3 z-30">
            <Tooltip><TooltipTrigger asChild><button ref={buttonRef} type="button" aria-label="Start guided tour" onClick={() => useTour.getState().start()} className="flex size-11 items-center justify-center rounded-full border border-blue-200 bg-white text-xl font-bold text-blue-700 shadow-sm hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">?</button></TooltipTrigger><TooltipContent side="left">Guided tour</TooltipContent></Tooltip>
        </div>
        {active && !targetReady && <p role="status" className="absolute right-3 top-16 z-30 max-w-64 rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-800 shadow-sm">Waiting for “{current?.title}”… If its panel is closed, reopen it; for the tree, select a node. <button type="button" onClick={() => useTour.getState().stop()} className="font-semibold underline">Skip tour</button></p>}
        {!active && message && <p role="status" className="absolute right-3 top-16 z-30 max-w-64 rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-700 shadow-sm">{message}</p>}
        </>, surface)}
        {active && targetReady && <Joyride key={`${run}:${revision}`} run continuous stepIndex={stepIndex} steps={steps} tooltipComponent={TourTooltip}
            floatingOptions={tourFloatingOptions}
            options={{ primaryColor: "#2563eb", textColor: "#1e293b", width: 320, zIndex: 45, arrowSize: 10, arrowBase: 20, spotlightRadius: 12, blockTargetInteraction: false, overlayClickAction: false, dismissKeyAction: false, closeButtonAction: "skip", scrollDuration: 0, skipScroll: true, targetWaitTimeout: 15000 }}
            onEvent={event => {
                const state = useTour.getState();
                if (state.scope !== scope || state.revision !== revision) return;
                if (event.action === "close" || event.action === "skip") state.stop();
                if (event.type === EVENTS.ERROR || event.type === EVENTS.TARGET_NOT_FOUND) state.stop("These tour controls are unavailable. Try ? again once the page is ready.");
            }} />}
    </>;
}
