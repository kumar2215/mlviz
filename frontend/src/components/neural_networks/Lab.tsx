import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { RotateCcw, Shuffle, Play, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actionClass, LabFrame, optionClass } from "@/pages/nlp/shared/LabFrame";
import { fmt } from "@/utils/neuralNetworks";
import type { Network } from "@/types/neuralNetworks";
import { Choice, NumberField } from "@/components/input/NeuralInputs";
import type { ParameterSelection } from "@/store/neuralNetworks";
import { parameterName } from "@/utils/neuralParameters";
import { useNeuralPresentation } from "@/store/neuralNetworks";

interface PanelProps { id: string; title: string; children: ReactNode }
export function Slide({ children }: PanelProps) { return <>{children}</>; }
export function ControlGroup({ children }: PanelProps) { return <>{children}</>; }
function panels(children: ReactNode): PanelProps[] {
    return Children.toArray(children).flatMap(child => !isValidElement<PanelProps>(child) ? [] : child.type === Fragment ? panels(child.props.children) : [child.props]);
}
export function Lab({ id, title, description, controls, children, loading, error, retry }: { id: string; title: string; description: string; controls: ReactNode; children: ReactNode; loading?: boolean; error?: string | null; retry?: () => void }) {
    const view = useNeuralPresentation(state => state.views[id]);
    const selectSlide = useNeuralPresentation(state => state.selectSlide);
    const selectControls = useNeuralPresentation(state => state.selectControls);
    const slides = panels(children);
    const groups = panels(controls);
    const active = slides.find(slide => slide.id === view?.slide) ?? slides[0];
    const group = groups.find(group => group.id === view?.controls) ?? groups[0];
    return <LabFrame>
        {error && <div role="alert" className="shrink-0 rounded-lg bg-red-50 p-2 text-sm text-red-900">{error} <Button size="sm" variant="outline" onClick={retry}>Retry</Button></div>}
        <header className="shrink-0"><h2 className="text-lg font-semibold text-cyan-950">{title}</h2><p className="text-sm text-slate-600">{description}</p></header>
        <nav aria-label={`${title} sections`} className="flex shrink-0 flex-wrap gap-2" data-page-id={id}>
            {slides.map(slide => <Button key={slide.id} data-slide-id={slide.id} aria-pressed={slide.id === active.id} className={slide.id === active.id ? actionClass : optionClass} onClick={() => selectSlide(id, slide.id)}>{slide.title}</Button>)}
        </nav>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(160px,0.35fr)_minmax(0,1fr)] gap-3">
            <section aria-label="Inputs and parameters" className="flex min-h-0 min-w-0 flex-col gap-3 rounded-xl bg-blue-50 p-3">
                <h3 className="shrink-0 text-sm font-semibold text-blue-950">Inputs & parameters</h3>
                {groups.length > 1 && <label className="shrink-0 text-xs text-slate-700">Controls<select aria-label="Control group" value={group.id} onChange={event => selectControls(id, event.target.value)} className="mt-1 w-full rounded-md border border-blue-200 bg-white p-2 text-sm">{groups.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>}
                <fieldset disabled={loading} className="min-h-0 flex-1 space-y-3 overflow-auto disabled:opacity-60" data-control-id={group.id}>{group.children}</fieldset>
            </section>
            <section aria-label={active.title} aria-busy={loading} data-active-slide={active.id} className="relative flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">{active.children}{(loading || error) && <div role="status" className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/85 text-sm text-slate-600">{error ? "Calculation unavailable. Retry or adjust your inputs." : "Calculating…"}</div>}</section>
        </div>
    </LabFrame>;
}
export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
    return <section className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-blue-100 p-3 ${className}`}><h3 className="mb-2 shrink-0 text-sm font-semibold text-slate-800">{title}</h3><div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">{children}</div></section>;
}
export function Note({ children }: { children: ReactNode }) {
    return <p role="status" className="shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-950">{children}</p>;
}
export function PagedTable({ id, headers, rows, pageSize = 6 }: { id: string; headers: string[]; rows: ReactNode[]; pageSize?: number }) {
    const requestedPage = useNeuralPresentation(state => state.views[id]?.itemPage ?? 0);
    const selectItems = useNeuralPresentation(state => state.selectItems);
    const count = Math.max(1, Math.ceil(rows.length / pageSize));
    const page = Math.min(requestedPage, count - 1);
    return <div className="flex min-h-0 flex-1 flex-col gap-2"><div className="min-h-0 flex-1 overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{headers.map(header => <th key={header} scope="col" className="p-2">{header}</th>)}</tr></thead><tbody>{rows.slice(page * pageSize, (page + 1) * pageSize)}</tbody></table>{!rows.length && <p className="p-2 text-sm text-slate-500">No updates yet.</p>}</div>{count > 1 && <div className="flex shrink-0 items-center justify-between gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => selectItems(id, page - 1)}>Previous rows</Button><span className="text-xs text-slate-500">{page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} of {rows.length}</span><Button size="sm" variant="outline" disabled={page === count - 1} onClick={() => selectItems(id, page + 1)}>Next rows</Button></div>}</div>;
}
export function ResetButtons({ reset, randomize }: { reset: () => void; randomize?: () => void }) {
    return <div className="flex flex-wrap gap-2">{randomize && <Button size="sm" variant="outline" onClick={randomize}><Shuffle />Initialize</Button>}<Button size="sm" variant="outline" onClick={reset}><RotateCcw />Reset</Button></div>;
}
export function Playback({ playing, onToggle, onStep, disabled = false, label = "Step" }: { playing: boolean; onToggle: () => void; onStep: () => void; disabled?: boolean; label?: string }) {
    return <div className="flex flex-wrap gap-2"><Button size="sm" disabled={disabled} onClick={onStep}><SkipForward />{label}</Button><Button size="sm" variant="outline" disabled={disabled} aria-pressed={playing} onClick={onToggle}>{playing ? <Pause /> : <Play />}{playing ? "Pause" : "Play"}</Button></div>;
}
export function StageControls({ phase, labels, onChange }: { phase: number; labels: string[]; onChange: (phase: number) => void }) {
    return <div className="flex flex-wrap gap-2" aria-label="Calculation stages">{labels.map((label, i) => <Button key={label} size="sm" variant={phase === i ? "default" : "outline"} aria-pressed={phase === i} onClick={() => onChange(i)}>{i + 1}. {label}</Button>)}</div>;
}
export function Vector({ values, label, highlight = -1 }: { values: number[]; label: string; highlight?: number }) {
    return <div className="min-w-0"><p className="mb-1 text-xs font-medium text-slate-500">{label} · {values.length}×1</p><div className="grid gap-2 rounded-lg border-x-2 border-blue-300 p-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>{values.map((value, i) => <span key={i} className={`min-w-0 rounded px-2 py-1 text-center font-mono text-xs ${highlight === i ? "bg-blue-700 text-white" : "bg-slate-50 text-slate-800"}`}>{fmt(value)}</span>)}</div></div>;
}
export function Matrix({ values, label, row = -1, onSelect }: { values: number[][]; label: string; row?: number; onSelect?: (row: number, column: number) => void }) {
    return <div className="overflow-x-auto"><p className="mb-2 text-xs font-medium text-slate-500">{label} · {values.length}×{values[0]?.length ?? 0}</p><table className="w-full table-fixed border-separate border-spacing-1 text-center font-mono text-xs"><tbody>{values.map((values, j) => <tr key={j}>{values.map((value, k) => <td key={k} className={`rounded ${row === j ? "bg-blue-100" : "bg-slate-50"}`}>{onSelect ? <button className="w-full rounded p-2 hover:bg-blue-200 focus-visible:ring-2 focus-visible:ring-blue-600" aria-label={`${label} row ${j + 1}, column ${k + 1}: ${fmt(value)}`} onClick={() => onSelect(j, k)}>{fmt(value)}</button> : <span className="block p-2">{fmt(value)}</span>}</td>)}</tr>)}</tbody></table></div>;
}
export function ParameterEditor({ network, selected, onSelect, onChange }: { network: Network; selected: ParameterSelection; onSelect: (selection: ParameterSelection) => void; onChange: (selection: ParameterSelection, value: number) => void }) {
    const layer = network[selected.layer];
    const value = selected.column < 0 ? layer.biases[selected.row] : layer.weights[selected.row][selected.column];
    return <div className="space-y-2"><Choice label="Inspect layer" value={String(selected.layer)} options={network.map((_, l) => String(l))} onChange={l => onSelect({ layer: Number(l), row: 0, column: 0 })} />
        <p className="text-xs text-slate-500">Layers are indexed from 0. Select a matrix cell or bias to edit it.</p>
        <Matrix values={layer.weights} label={`W[${selected.layer}]`} row={selected.row} onSelect={(row, column) => onSelect({ ...selected, row, column })} />
        <div className="flex flex-wrap gap-1">{layer.biases.map((b, row) => <Button key={row} size="sm" variant={selected.column === -1 && selected.row === row ? "default" : "outline"} onClick={() => onSelect({ ...selected, row, column: -1 })}>b{row} = {fmt(b)}</Button>)}</div>
        <NumberField label={parameterName(selected)} value={value} min={-100} max={100} onChange={value => onChange(selected, value)} />
    </div>;
}

export function LabLoading({ error, retry }: { error: string | null; retry: () => void }) {
    return <LabFrame><div role={error ? "alert" : "status"} className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-600">{error || "Loading calculations…"}{error && <Button onClick={retry}>Retry</Button>}</div></LabFrame>;
}
