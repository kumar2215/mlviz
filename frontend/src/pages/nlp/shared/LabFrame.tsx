import type { ReactNode } from "react";
export const actionClass = "h-auto min-h-10 border border-primary !bg-primary px-3 py-2 text-primary-foreground shadow-sm hover:!bg-primary-hover";
export const optionClass = "h-auto min-h-10 whitespace-normal border border-info-border !bg-selection px-3 py-2 text-info-foreground shadow-sm hover:!bg-selection-hover";
export function LabFrame({ children }: { children: ReactNode }) {
    return <main className="h-full min-h-0 overflow-hidden p-3"><section className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-2 rounded-xl border border-info-border bg-surface p-3 shadow-sm">{children}</section></main>;
}
export function Status({ children, success = false }: { children: ReactNode; success?: boolean }) {
    return <div role="status" className={`shrink-0 rounded-lg px-3 py-2 text-sm ${success ? "bg-success text-success-foreground" : "bg-surface-tint text-info-foreground"}`}>{children}</div>;
}
