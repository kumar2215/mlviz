import { Input } from "@/components/ui/input";
import type { IntOption } from "@/types/parameters";
import React from "react";

interface IntegerInputProps {
    option: IntOption;
    currentValue: number | null | undefined;
    onValueChange: (key: string, value: number | null | undefined) => void;
    id: string;
}

const IntegerInput = ({
    option,
    currentValue,
    onValueChange,
    id,
}: IntegerInputProps) => {
    const displayValue =
        currentValue === null || currentValue === undefined
            ? ""
            : String(currentValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            onValueChange(option.name, null);
        } else {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed)) {
                onValueChange(option.name, parsed);
            }
        }
    };

    return (
        <Input
            type="number"
            id={id}
            value={displayValue}
            onChange={handleChange}
            placeholder={String(option.default)}
            min={option.min ?? undefined}
            max={option.max ?? undefined}
            step="1"
            className="bg-surface-subtle font-mono"
        />
    );
};

export default IntegerInput;
