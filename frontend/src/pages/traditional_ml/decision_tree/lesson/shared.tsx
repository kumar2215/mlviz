import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export const choiceClass = "h-auto min-h-10 whitespace-normal border border-indigo-300 !bg-indigo-100 px-3 py-2 text-indigo-950 shadow-sm hover:!bg-indigo-200";
export const selectedClass = "h-auto min-h-10 whitespace-normal border border-indigo-700 !bg-indigo-700 px-3 py-2 text-white shadow-sm hover:!bg-indigo-800";

export function Frame({ children }: { children: ReactNode }) {
    return <main className="h-full min-h-0 bg-gradient-to-br from-blue-50 to-violet-50 p-3">
        <section className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-2 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
            {children}
        </section>
    </main>;
}

export function Result({ children, success = false }: { children: ReactNode; success?: boolean }) {
    return <p role="status" className={`shrink-0 rounded-lg px-3 py-2 text-sm ${success ? "bg-emerald-100 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{children}</p>;
}

const DragContext = createContext<{ selected: string | null; select: (id: string | null) => void }>({ selected: null, select: () => {} });

export function DragSurface({ children }: { children: ReactNode }) {
    const [selected, select] = useState<string | null>(null);
    return <DragContext.Provider value={{ selected, select }}>{children}</DragContext.Provider>;
}

export function DragChip({ id, children, label, disabled = false }: { id: string; children: ReactNode; label: string; disabled?: boolean }) {
    const { selected, select } = useContext(DragContext);
    return <Button
        type="button"
        draggable={!disabled}
        disabled={disabled}
        aria-label={label}
        aria-pressed={selected === id}
        className={`${selected === id ? selectedClass : choiceClass} cursor-grab active:cursor-grabbing`}
        onClick={event => { event.stopPropagation(); select(selected === id ? null : id); }}
        onDragStart={event => {
            event.dataTransfer.setData("text/plain", id);
            event.dataTransfer.effectAllowed = "move";
            select(id);
        }}
        onDragEnd={() => select(null)}
    >{children}</Button>;
}

export function DropTarget({ label, onPlace, children, className = "", disabled = false }: {
    label: string;
    onPlace: (id: string) => void;
    children: ReactNode;
    className?: string;
    disabled?: boolean;
}) {
    const { selected, select } = useContext(DragContext);
    const [hovered, setHovered] = useState(false);
    const place = (id: string | null) => {
        if (!disabled && id) { onPlace(id); select(null); }
    };
    return <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        className={`lesson-drop ${hovered ? "lesson-drop-hover" : ""} ${selected && !disabled ? "lesson-drop-ready" : ""} ${className}`}
        onClick={() => place(selected)}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); place(selected); } }}
        onDragOver={event => { if (!disabled) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setHovered(true); } }}
        onDragLeave={() => setHovered(false)}
        onDrop={event => {
            event.preventDefault();
            setHovered(false);
            place(event.dataTransfer.getData("text/plain"));
        }}
    >{children}</div>;
}

export function FlowerIcon({ small = false }: { small?: boolean }) {
    return <svg aria-hidden="true" viewBox="0 0 40 40" className={small ? "size-5 shrink-0" : "size-8 shrink-0"}>
        <path d="M20 23v14m0-3c-6 0-9-4-9-4 6-1 9 1 9 4" fill="none" stroke="#059669" strokeWidth="2.5" />
        {[0, 60, 120, 180, 240, 300].map(angle => <ellipse key={angle} cx="20" cy="11" rx="4" ry="8" fill="#a78bfa" stroke="#7c3aed" strokeWidth="1" transform={`rotate(${angle} 20 18)`} />)}
        <circle cx="20" cy="18" r="4" fill="#fbbf24" />
    </svg>;
}

export function TreeEdges({ expanded = true }: { expanded?: boolean }) {
    return <svg aria-hidden="true" className="lesson-tree-edges" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <path d="M500 100 L180 450 M500 100 L740 450" />
        {expanded && <path d="M740 450 L590 840 M740 450 L890 840" />}
    </svg>;
}

export function TreeNode({ x, y, width, children, className = "" }: { x: number; y: number; width: number; children: ReactNode; className?: string }) {
    return <div className={`lesson-tree-node ${className}`} style={{ left: `${x}%`, top: `${y}%`, width: `${width}%` }}>{children}</div>;
}
