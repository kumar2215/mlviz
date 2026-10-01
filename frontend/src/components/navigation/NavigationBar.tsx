import NavigationButton from "@/components/navigation/NavigationButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Parameters } from "@/types/page";
import type { Transition } from "@/types/story";
import type { HistoryState } from "@/types/history";
import { ArrowLeft, RotateCcw, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { isConditionMet, displayCondition } from "@/utils/conditions";

interface NavigationBarProps {
    transitions: Transition[];
    handleNext: (pageId: number) => void;
    onBack: () => void;
    canGoBack: boolean;
    currentHistory: HistoryState;
    subpage?: {
        index: number;
        labels: string[];
        canAdvance: boolean;
        onNext: () => void;
        onReplay: () => void;
    };
}

const NavigationBar: React.FC<NavigationBarProps> = ({
    transitions,
    handleNext,
    onBack,
    canGoBack,
    currentHistory,
    subpage,
}) => {
    // Timer state for "Wait" conditions
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const hasWaitConditions = transitions.some(
            (t) => t.condition.condition_type === "Wait",
        );
        if (!hasWaitConditions) return;

        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 250); // Re-evaluate roughly 4 times a second

        return () => clearInterval(intervalId);
    }, [transitions]);

    const conditionState = {
        ...currentHistory.params,
        __history: currentHistory,
        __now: now,
    } as unknown as Record<string, Parameters>;

    const completeTransitions = transitions.filter((a) =>
        isConditionMet(a.condition, conditionState),
    );
    const incompleteTransitions = transitions.filter(
        (a) => !isConditionMet(a.condition, conditionState),
    );

    return (
        <div className="p-4 w-full flex flex-col items-center gap-4">
            <p className="text-2xl text-slate-500 flex items-center gap-2">
                <Route className="h-5 w-5" /> Pathways
            </p>

            <div className="h-full w-full overflow-hidden flex flex-col gap-2">
                <Button
                    onClick={onBack}
                    disabled={!canGoBack}
                    className="w-full !bg-slate-200 text-slate-800 hover:!bg-slate-300 disabled:!bg-slate-100 disabled:text-slate-500 disabled:opacity-100 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                {subpage && (
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700">
                        <p className="font-semibold">Step {subpage.index + 1} of {subpage.labels.length}</p>
                        <p>{subpage.labels[subpage.index]}</p>
                    </div>
                )}
                {subpage && subpage.index < subpage.labels.length - 1 && (
                    <Button disabled={!subpage.canAdvance} onClick={subpage.onNext} className="h-auto min-h-12 w-full border border-blue-600 !bg-blue-600 py-2 text-white shadow-sm hover:!bg-blue-700 disabled:border-blue-300 disabled:!bg-blue-100 disabled:text-blue-700 disabled:opacity-100">
                        Next: {subpage.labels[subpage.index + 1]}
                    </Button>
                )}
                {subpage && (
                    <Button onClick={subpage.onReplay} className="w-full border border-violet-300 !bg-violet-100 text-violet-900 shadow-sm hover:!bg-violet-200">
                        <RotateCcw className="mr-2 size-4" /> Replay
                    </Button>
                )}
                {completeTransitions.map((transition) => (
                    <NavigationButton
                        key={displayCondition(transition.condition)}
                        transition={transition}
                        handleNext={handleNext}
                        conditionState={conditionState}
                        currentHistory={currentHistory}
                    />
                ))}

                {completeTransitions && incompleteTransitions && <Separator />}
                {incompleteTransitions.map((transition) => (
                    <NavigationButton
                        key={displayCondition(transition.condition)}
                        transition={transition}
                        handleNext={handleNext}
                        conditionState={conditionState}
                        currentHistory={currentHistory}
                    />
                ))}
            </div>
        </div>
    );
};

export default NavigationBar;
