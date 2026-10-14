import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const DragContext = createContext<{ selected: string | null; select: (id: string | null) => void }>({ selected: null, select: () => {} });
export function DragAndDrop({ children }: { children: ReactNode }) {
    const [selected, select] = useState<string | null>(null);
    return <DragContext.Provider value={{ selected, select }}>{children}</DragContext.Provider>;
}
export function DragItem({ id, label, disabled = false, children }: { id: string; label: string; disabled?: boolean; children: ReactNode }) {
    const { selected, select } = useContext(DragContext);
    return <Button type="button" aria-label={label} aria-pressed={selected === id} draggable={!disabled} disabled={disabled}
        className={`h-auto min-h-10 max-w-full cursor-grab break-all whitespace-normal border px-3 py-2 font-mono text-sm shadow-sm active:cursor-grabbing ${selected === id ? "border-violet-600 !bg-violet-600 text-white" : "border-violet-200 !bg-violet-100 text-violet-950 hover:!bg-violet-200"}`}
        onClick={() => select(selected === id ? null : id)}
        onDragStart={event => { event.dataTransfer.setData("text/plain", id); event.dataTransfer.effectAllowed = "move"; select(id); }}
        onDragEnd={() => select(null)}>{children}</Button>;
}
export function DropArea({ label, disabled = false, onPlace, children }: { label: string; disabled?: boolean; onPlace: (id: string) => void; children: ReactNode }) {
    const { selected, select } = useContext(DragContext);
    const [hovered, setHovered] = useState(false);
    const place = (id: string | null) => { if (!disabled && id) { onPlace(id); select(null); } };
    return <div role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-disabled={disabled}
        className={`min-h-20 rounded-xl border-2 border-dashed p-3 outline-offset-2 ${hovered ? "border-violet-600 bg-violet-200" : "border-violet-300 bg-violet-50"}`}
        onClick={() => place(selected)}
        onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); place(selected); } }}
        onDragOver={event => { if (!disabled) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setHovered(true); } }}
        onDragLeave={() => setHovered(false)}
        onDrop={event => { event.preventDefault(); setHovered(false); place(event.dataTransfer.getData("text/plain")); }}>{children}</div>;
}
