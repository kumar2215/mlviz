// components/ui/ParameterLabel.tsx
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ModelOption } from "@/types/parameters";
import { Info } from "lucide-react"; // or your preferred icon

interface ParameterLabelProps {
    option: ModelOption;
    htmlFor: string;
}

const ParameterLabel = ({ option, htmlFor }: ParameterLabelProps) => {
    return (
        <div className="flex flex-row gap-4 items-center justify-between">
            <Label
                className="text-clip"
                htmlFor={htmlFor}
            >
                {option.name}
            </Label>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info />
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs max-w-[15vw]">{option.description}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
};

export default ParameterLabel;
