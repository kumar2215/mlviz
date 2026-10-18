import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import DragSelectionSurface from "./DragSelectionSurface";
import useDragSelection from "@/hooks/useDragSelection";

export function DragAndDrop({ children }: { children: ReactNode }) {
    return <DragSelectionSurface>{children}</DragSelectionSurface>;
}

export function DragItem({ id, label, disabled = false, children }: { id: string; label: string; disabled?: boolean; children: ReactNode }) {
    const { ref, selected, select } = useDragSelection<HTMLButtonElement>();
    return (
        <Button ref={ref} type="button" aria-label={label} aria-pressed={selected === id} draggable={!disabled} disabled={disabled}
            className={`h-auto min-h-10 max-w-full cursor-grab break-all whitespace-normal border px-3 py-2 font-mono text-sm shadow-sm active:cursor-grabbing ${selected === id ? "border-sky-600 !bg-sky-600 text-white" : "border-sky-200 !bg-sky-100 text-sky-950 hover:!bg-sky-200"}`}
            onClick={() => select(selected === id ? null : id)}
            onDragStart={event => { event.dataTransfer.setData("text/plain", id); event.dataTransfer.effectAllowed = "move"; select(id); }}
            onDragEnd={() => select(null)}>{children}
        </Button>
    );
}

export function DropArea({ label, disabled = false, onPlace, children }: { label: string; disabled?: boolean; onPlace: (id: string) => void; children: ReactNode }) {
    const { ref, selected, select } = useDragSelection<HTMLDivElement>();
    const [hovered, setHovered] = useState(false);
    const place = (id: string | null) => {
        if (!disabled && id) {
            onPlace(id);
            select(null);
        }
    };
    return (
        <div 
            ref={ref} role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-disabled={disabled}
            className={`min-h-20 rounded-xl border-2 border-dashed p-3 outline-offset-2 ${hovered ? "border-sky-600 bg-sky-200" : "border-sky-300 bg-sky-50"}`}
            onClick={() => place(selected)}
            onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); place(selected); } }}
            onDragOver={event => { if (!disabled) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setHovered(true); } }}
            onDragLeave={() => setHovered(false)}
            onDrop={event => { event.preventDefault(); setHovered(false); place(event.dataTransfer.getData("text/plain")); }}
        >
            {children}
        </div>
    );
}
