import { Input } from "@/components/ui/input";
import type { NumberOption } from "@/types/parameters";
import React from "react";

interface NumberInputProps {
    option: NumberOption;
    currentValue: string | number | undefined;
    onValueChange: (key: string, value: string | number | undefined) => void;
    id: string;
}

const NumberInput = ({
    option,
    currentValue,
    onValueChange,
    id,
}: NumberInputProps) => {
    const displayValue = currentValue === undefined ? "" : String(currentValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            onValueChange(option.name, undefined);
        } else {
            // Try to parse as number, but keep as string if it contains decimal
            const parsed = value.includes(".")
                ? parseFloat(value)
                : parseInt(value, 10);
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
            step={option.step || "any"}
            className="bg-surface-subtle font-mono"
        />
    );
};

export default NumberInput;
