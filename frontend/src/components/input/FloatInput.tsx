import { Input } from "@/components/ui/input";
import type { FloatOption } from "@/types/parameters";
import React from "react";

interface FloatInputProps {
    option: FloatOption;
    currentValue: number | undefined;
    onValueChange: (key: string, value: number | undefined) => void;
    id: string;
}

const FloatInput = ({
    option,
    currentValue,
    onValueChange,
    id,
}: FloatInputProps) => {
    const displayValue = currentValue === undefined ? "" : String(currentValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            onValueChange(option.name, undefined);
        } else {
            const parsed = parseFloat(value);
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
            step={option.step || "0.01"}
            className="bg-surface-subtle font-mono"
        />
    );
};

export default FloatInput;
