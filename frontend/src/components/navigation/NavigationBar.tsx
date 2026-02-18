import NavigationButton from "@/components/navigation/NavigationButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CurrentStoryContext } from "@/contexts/StoryContext";
import type { Edge } from "@/types/story";
import { displayCondition, isConditionMet } from "@/utils/conditions";
import { ArrowLeft, Route } from "lucide-react";
import { useContext } from "react";

interface NavigationBarProps {
    edges: Edge[];
    handler: (h: number) => void;
    onBack: () => void;
    canGoBack: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ edges, handler, onBack, canGoBack }) => {
    const context = useContext(CurrentStoryContext);
    if (!context) throw new Error("Must be within CurrentStoryProvider");
    const { storyState } = context;

    const completeEdges = edges.filter((a) =>
        isConditionMet(a.condition, storyState.params),
    );
    const incompleteEdges = edges.filter(
        (a) => !isConditionMet(a.condition, storyState.params),
    );

    return (
        <div className="p-4 w-full flex flex-col items-center gap-4">
            <p className="text-xl text-slate-500 flex items-center gap-2">
                <Route className="h-4 w-4" /> Pathways
            </p>
            
            <div className="h-full w-full overflow-hidden flex flex-col gap-2">
                {completeEdges.map((edge) => (
                    <NavigationButton
                        key={displayCondition(edge.condition)}
                        edge={edge}
                        handler={handler}
                    />
                ))}
                <Button
                onClick={onBack}
                disabled={!canGoBack}
                className="w-full bg-gradient-to-br from-slate-100 to-gray-100 text-gray-700 hover:from-blue-500 hover:to-purple-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                {completeEdges && incompleteEdges && <Separator />}
                {incompleteEdges.map((edge) => (
                    <NavigationButton
                        key={displayCondition(edge.condition)}
                        edge={edge}
                        handler={handler}
                    />
                ))}
            </div>
        </div>
    );
};

export default NavigationBar;
