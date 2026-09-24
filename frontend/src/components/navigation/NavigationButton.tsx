import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useVisualisation } from "@/store/useVisualisation";
import type { Parameters } from "@/types/page";
import type { Transition } from "@/types/visualisation";
import {
    displayCondition,
    getWaitTimeRemaining,
    isConditionMet,
} from "@/utils/conditions";
import { CheckCircle, XCircle } from "lucide-react";

interface NavigationButtonProps {
    transition: Transition;
    handleNext: (pageId: number) => void;
    conditionState?: Record<string, Parameters>;
}

const NavigationButton: React.FC<NavigationButtonProps> = ({
    transition,
    handleNext,
    conditionState,
}) => {
    const { currentVisualisationHistory } = useVisualisation();

    const _conditionState =
        conditionState ??
        ({
            ...currentVisualisationHistory.params,
            __history: currentVisualisationHistory,
        } as unknown as Record<string, Parameters>);

    const isNavigable = isConditionMet(transition.condition, _conditionState);

    const goToNextPage = () => {
        const nextPageId = transition.to;
        if (isNavigable) {
            handleNext(nextPageId);
        }
    };

    let statusText = isNavigable ? "Complete" : "Incomplete";
    if (!isNavigable && transition.condition.condition_type === "Wait") {
        const remaining = getWaitTimeRemaining(transition.condition, _conditionState);
        if (remaining > 0) {
            statusText = `${Math.ceil(remaining)}s`;
        }
    }

    const title = transition.condition.name ?? displayCondition(transition.condition);
    const description = transition.condition.description;

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
                    key={`${transition.to}-${displayCondition(transition.condition)}`}
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
