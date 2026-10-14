import type { ReactNode } from "react";
export const actionClass = "h-auto min-h-10 border border-indigo-700 !bg-indigo-700 px-3 py-2 text-white shadow-sm hover:!bg-indigo-800";
export const optionClass = "h-auto min-h-10 whitespace-normal border border-indigo-200 !bg-indigo-100 px-3 py-2 text-indigo-950 shadow-sm hover:!bg-indigo-200";
export function LabFrame({ children }: { children: ReactNode }) {
    return <main className="h-full min-h-0 overflow-hidden bg-gradient-to-br from-cyan-50 to-violet-50 p-3"><section className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-2 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">{children}</section></main>;
}
export function Status({ children, success = false }: { children: ReactNode; success?: boolean }) {
    return <div role="status" className={`shrink-0 rounded-lg px-3 py-2 text-sm ${success ? "bg-emerald-100 text-emerald-950" : "bg-indigo-50 text-indigo-950"}`}>{children}</div>;
}
