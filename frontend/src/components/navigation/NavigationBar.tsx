import NavigationButton from "@/components/navigation/NavigationButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrentStory } from "@/store/useAppStore";
import type { Edge, Parameters } from "@/types/story";
import { ArrowLeft, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { isConditionMet, displayCondition } from "@/utils/conditions";

interface NavigationBarProps {
    edges: Edge[];
    handler: (h: number) => void;
    onBack: () => void;
    canGoBack: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
    edges,
    handler,
    onBack,
    canGoBack,
}) => {
    const { storyState } = useCurrentStory();

    // Timer state for "Wait" conditions
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const hasWaitConditions = edges.some(
            (e) => e.condition.condition_type === "Wait",
        );
        if (!hasWaitConditions) return;

        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 250); // Re-evaluate roughly 4 times a second

        return () => clearInterval(intervalId);
    }, [edges]);

    const conditionState = {
        ...storyState.params,
        __history: storyState.history,
        __now: now,
    } as unknown as Record<string, Parameters>;

    const completeEdges = edges.filter((a) =>
        isConditionMet(a.condition, conditionState),
    );
    const incompleteEdges = edges.filter(
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
                {completeEdges.map((edge) => (
                    <NavigationButton
                        key={displayCondition(edge.condition)}
                        edge={edge}
                        handler={handler}
                        conditionState={conditionState}
                    />
                ))}

                {completeEdges && incompleteEdges && <Separator />}
                {incompleteEdges.map((edge) => (
                    <NavigationButton
                        key={displayCondition(edge.condition)}
                        edge={edge}
                        handler={handler}
                        conditionState={conditionState}
                    />
                ))}
            </div>
        </div>
    );
};

export default NavigationBar;
