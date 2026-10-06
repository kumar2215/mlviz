import NavigationButton from "@/components/navigation/NavigationButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Parameters } from "@/types/page";
import type { Transition } from "@/types/story";
import type { HistoryState } from "@/types/history";
import { ArrowLeft, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { isConditionMet, displayCondition } from "@/utils/conditions";

interface NavigationBarProps {
    transitions: Transition[];
    handleNext: (pageId: number) => void;
    onBack: () => void;
    canGoBack: boolean;
    currentHistory: HistoryState;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
    transitions,
    handleNext,
    onBack,
    canGoBack,
    currentHistory
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
                    className="w-full bg-gradient-to-br from-slate-100 to-gray-100 text-gray-700 hover:from-blue-500 hover:to-purple-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
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
