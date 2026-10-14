import { Button } from "@/components/ui/button";
import { actionClass } from "./LabFrame";
export default function WordsEditor({ value, onChange, onApply, pending, label = "Words (up to six)" }: { value: string; onChange: (value: string) => void; onApply: () => void; pending: boolean; label?: string }) {
    return <div className="flex shrink-0 items-end gap-2 rounded-lg bg-indigo-50 p-2"><label className="min-w-0 flex-1 text-sm font-medium">{label}<input aria-label={label} value={value} disabled={pending} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-sm" /></label><Button className={actionClass} disabled={pending || !value.trim()} onClick={onApply}>{pending ? "Loading…" : "Use words"}</Button></div>;
}
