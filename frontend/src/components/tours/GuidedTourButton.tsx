import { useEffect, useRef } from "react";
import { useTour } from "@/store/tourStore";
import { useStory } from "@/store/useStory";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function GuidedTourButton() {
    const storyMode = useStory(state => state.currentStory !== null);
    const tour = useTour(state => state.tour);
    const scope = useTour(state => state.scope);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => useTour.subscribe((state, previous) => {
        if (previous.running && !state.running && state.scope === scope) {
            requestAnimationFrame(() => {
                if (useTour.getState().scope === scope && !useTour.getState().running) buttonRef.current?.focus({ preventScroll: true });
            });
        }
    }), [scope]);

    if (storyMode || !tour) return null;
    return <Tooltip>
        <TooltipTrigger asChild>
            <button ref={buttonRef} data-tour-help type="button" aria-label="Start guided tour" onClick={() => useTour.getState().start()}
                className="flex size-7 items-center justify-center rounded-md text-base font-bold leading-none text-selection-foreground hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-ring">?</button>
        </TooltipTrigger>
        <TooltipContent side="left">Guided tour</TooltipContent>
    </Tooltip>;
}
