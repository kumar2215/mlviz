import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useCurrentStory } from "@/store/useAppStore";
import type { Edge, Parameters } from "@/types/story";
import {
    displayCondition,
    getWaitTimeRemaining,
    isConditionMet,
} from "@/utils/conditions";
import { CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NavigationButtonProps {
    edge: Edge;
    handler: (h: number) => void;
    conditionState?: Record<string, Parameters>;
}

const NavigationButton: React.FC<NavigationButtonProps> = ({
    edge,
    handler,
    conditionState,
}) => {
    const { storyState, addEdge } = useCurrentStory();

    const navigate = useNavigate();

    const _conditionState =
        conditionState ??
        ({
            ...storyState.params,
            __history: storyState.history,
        } as unknown as Record<string, Parameters>);

    const isNavigable = isConditionMet(edge.condition, _conditionState);

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

    let statusText = isNavigable ? "Complete" : "Incomplete";
    if (!isNavigable && edge.condition.condition_type === "Wait") {
        const remaining = getWaitTimeRemaining(edge.condition, _conditionState);
        if (remaining > 0) {
            statusText = `${Math.ceil(remaining)}s`;
        }
    }

    const title = edge.condition.name ?? displayCondition(edge.condition);
    const description = edge.condition.description;

    return (
        <div className="@container w-full">
            <Button
                asChild
                disabled={!isNavigable}
                onClick={goToNextPage}
                className={`
                group w-full min-h-[10dvh] h-auto p-0 transition-all duration-100 shadow-lg hover:shadow-md text-base tracking-tight overflow-hidden
                ${
                    isNavigable
                        ? `
                            border-0 bg-gradient-to-br from-emerald-100 to-blue-100 text-black
                            hover:bg-gradient-to-br hover:from-green-500 hover:to-blue-500 hover:text-white hover:shadow-2xl
                        `
                        : `
                            border-0 bg-gradient-to-br from-gray-100 to-stone-100 text-black
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
                        <span className="text-[0.6rem] font-semibold tracking-widest uppercase -rotate-90 whitespace-nowrap flex items-center gap-1">
                            {isNavigable ? (
                                <CheckCircle className="size-[0.6rem] shrink-0" />
                            ) : (
                                <XCircle className="size-[0.6rem] shrink-0" />
                            )}
                            <span className="hidden @[180px]:inline">
                                {statusText}
                            </span>
                        </span>
                    </div>

                    <div className="flex flex-col justify-start items-start py-3 px-3 flex-1 min-w-0">
                        <CardTitle className="text-wrap font-medium text-base leading-snug">
                            {title}
                        </CardTitle>
                        {description && (
                            <p className="text-sm text-muted-foreground mt-1 text-wrap leading-snug">
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
