import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { SelectOption } from "@/types/parameters";

interface SelectInputProps {
    option: SelectOption;
    currentValue: string | undefined;
    onValueChange: (key: string, value: string | undefined) => void;
    id: string;
    featureNames?: string[];
}

const SelectInput = ({
    option,
    currentValue,
    onValueChange,
    id,
    featureNames,
}: SelectInputProps) => {
    return (
        <Select
            value={currentValue || String(option.default)}
            onValueChange={(val: string) => onValueChange(option.name, val)}
        >
            <SelectTrigger
                id={id}
                className="w-full bg-surface-subtle"
            >
                <SelectValue placeholder={String(option.default)} />
            </SelectTrigger>
            <SelectContent>
                {Array.isArray(option.options) && (option.options as string[]).map((optionValue, index) => (
                    <SelectItem
                        value={optionValue}
                        key={optionValue}
                    >
                        {featureNames && featureNames[index] 
                            ? `${featureNames[index]} (${optionValue})`
                            : optionValue}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default SelectInput;
