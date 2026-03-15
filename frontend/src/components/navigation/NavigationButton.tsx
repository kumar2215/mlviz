import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CurrentStoryContext } from "@/contexts/StoryContext";
import type { Edge } from "@/types/story";
import { displayCondition, isConditionMet } from "@/utils/conditions";
import { CheckCircle, XCircle } from "lucide-react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";

interface NavigationButtonProps {
    edge: Edge;
    handler: (h: number) => void;
}

const NavigationButton: React.FC<NavigationButtonProps> = ({
    edge,
    handler,
}) => {
    const context = useContext(CurrentStoryContext);
    if (!context) throw new Error("Must be within CurrentStoryProvider");
    const { storyState, addEdge } = context;

    const navigate = useNavigate();

    const isNavigable = isConditionMet(edge.condition, {
        ...storyState.params,
        __history: storyState.history,
    });

    const goToNextPage = () => {
        const edgeNode = edge.end;
        if (isNavigable) {
            addEdge(edge.start);
            if (edgeNode.story_name) {
                navigate(`/story/${edgeNode.story_name}`, {
                    state: {
                        local_index: edgeNode.local_index,
                    },
                    replace: true,
                });
            } else {
                handler(edgeNode.local_index);
            }
        }
    };

    const statusText = isNavigable ? "Complete" : "Incomplete";
    const title = edge.condition.name ?? displayCondition(edge.condition);
    const description = edge.condition.description;

    return (
        <div className="@container w-full">
            <Button
                asChild
                disabled={!isNavigable}
                onClick={goToNextPage}
                className={`
                w-full min-h-[10dvh] h-auto p-0 transition-all duration-100 shadow-lg hover:shadow-md text-base tracking-tight overflow-hidden
                ${
                    isNavigable
                        ? `
                            border-0 bg-gradient-to-br from-emerald-100 to-blue-100 text-black
                            hover:bg-gradient-to-br hover:from-green-500 hover:to-blue-500 hover:text-white hover:shadow-2xl
                        `
                        : `
                            border-0 bg-gradient-to-br from-gray-100 to-stone-100 text-black
                            hover:bg-gradient-to-br hover:from-gray-100 hover:to-stone-100
                            cursor-not-allowed
                            `
                }
            `}
            >
                <Card
                    key={`${edge.end.story_name}_${edge.end.local_index}`}
                    className="flex flex-row justify-start items-stretch shadow-none w-full p-0 gap-0"
                >
                    {/* Rotated status label strip on the left */}
                    <div
                        className={`
                        shrink-0 w-6 flex items-center justify-center
                        ${isNavigable ? "bg-emerald-200/60" : "bg-stone-200/60 hover:"}
                        `}
                    >
                        <span className="text-[0.5rem] font-semibold tracking-widest uppercase -rotate-90 whitespace-nowrap flex items-center gap-1">
                            {isNavigable ? (
                                <CheckCircle className="size-[0.5rem] shrink-0" />
                            ) : (
                                <XCircle className="size-[0.5rem] shrink-0" />
                            )}
                            <span className="hidden @[180px]:inline">
                                {statusText}
                            </span>
                        </span>
                    </div>

                    {/* Main card content */}
                    <div className="flex flex-col justify-start items-start py-3 px-2 flex-1 min-w-0">
                        <CardTitle className="text-wrap font-medium text-sm leading-snug">
                            {title}
                        </CardTitle>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-0.5 text-wrap leading-snug">
                                {description}
                            </p>
                        )}
                    </div>
                </Card>
            </Button>
        </div>
    );
};

export default NavigationButton;
