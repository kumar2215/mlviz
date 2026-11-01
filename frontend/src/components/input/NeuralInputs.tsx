import { fmt } from "@/utils/neuralNetworks";

export function NumberField({ label, value, onChange, min = -20, max = 20, step = 0.1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
    return <label className="flex min-w-0 items-center justify-between gap-2 text-xs text-slate-700"><span>{label}</span><input aria-label={label} type="number" value={Number(value.toFixed(6))} min={min} max={max} step={step} onChange={event => { const number = event.currentTarget.valueAsNumber; if (Number.isFinite(number)) onChange(Math.max(min, Math.min(max, number))); }} className="w-24 rounded-md border border-blue-200 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500" /></label>;
}
export function Slider({ label, value, onChange, min = -5, max = 5, step = 0.05 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
    return <label className="block space-y-1 text-xs text-slate-700"><span className="flex justify-between gap-2"><span>{label}</span><output className="font-mono">{fmt(value)}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(event.currentTarget.valueAsNumber)} className="w-full accent-blue-700" /></label>;
}
export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
    return <label className="block space-y-1 text-xs text-slate-700"><span>{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value as T)} className="w-full rounded-md border border-blue-200 bg-white p-2 text-sm">{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}
