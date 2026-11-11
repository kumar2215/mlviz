import { Input } from "@/components/ui/input";
import type { AnyOption } from "@/types/parameters";
import React from "react";

interface AnyInputProps {
    option: AnyOption;
    currentValue: any;
    onValueChange: (key: string, value: any) => void;
    id: string;
}

const AnyInput = ({
    option,
    currentValue,
    onValueChange,
    id,
}: AnyInputProps) => {
    const displayValue =
        currentValue === undefined || currentValue === null
            ? ""
            : String(currentValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            onValueChange(option.name, null);
        } else {
            // Try to parse as number first, then keep as string
            const numValue = Number(value);
            onValueChange(option.name, isNaN(numValue) ? value : numValue);
        }
    };

    return (
        <Input
            type="text"
            id={id}
            value={displayValue}
            onChange={handleChange}
            placeholder={String(option.default)}
            className="bg-surface-subtle font-mono"
        />
    );
};

export default AnyInput;
