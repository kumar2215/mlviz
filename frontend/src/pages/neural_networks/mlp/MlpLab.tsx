import { Button } from "@/components/ui/button";
import { useMlp } from "@/store/neuralNetworks";
import { gates } from "@/types/neuralNetworks";
import { activations } from "@/types/neuralNetworks";
import { fmt } from "@/utils/neuralNetworks";
import { ActivationChart, Boundary, LossHistory, NetworkChart } from "@/components/neural_networks/Charts";
import { Card, LabLoading, ControlGroup, Lab, Matrix, Note, PagedTable, ParameterEditor, Playback, ResetButtons, Slide, Vector } from "@/components/neural_networks/Lab";
import { Choice, NumberField, Slider } from "@/components/input/NeuralInputs";
import { usePlayback } from "@/hooks/usePlayback";

const stop = () => useMlp.getState().patch({ playing: false });

export default function MlpLab({ view }: { view: "xor" | "activation" | "forward" | "dropout" | "variants" }) {
    const remote = useMlp();
    usePlayback(remote.data?.playing === true && view === "xor", remote.train, stop, 120);
    if (!remote.data || !remote.result) return <LabLoading error={remote.error} retry={remote.retry} />;
    const s = { ...remote.data, ...remote };
    const id = `mlp/${view}`;
    const masking = view === "dropout" || view === "variants";
    const single = view === "xor" && s.xorMode === "single";
    const r = single ? remote.result.single : remote.result.multi;
    const { network, trace, selected, z } = r;
    const l = selected.layer;
    const layer = network[l];
    const row = selected.row;
    const result = remote.result;
    const dropped = result.dropped;
    const titles = { xor: "Why a network needs nonlinearity", activation: "Explore activation functions", forward: "Forward computation, layer by layer", dropout: "Multiply activations by a dropout mask", variants: "Element-wise and channel-wise dropout" };
    const variants = <Card title="What changes between variants?"><div className="space-y-4 text-sm text-slate-600"><p><strong>Standard dropout:</strong> independent entries remove individual activations at different positions.</p><p><strong>Feature / spatial dropout:</strong> one channel mask is shared across all spatial positions in an example. Another example draws its own mask.</p><p><strong>Inverted dropout:</strong> divide retained training activations by 1 − p to preserve their expectation. Inference uses every activation without scaling.</p><p>This explorer isolates masking. The XOR playground trains without dropout.</p></div></Card>;
    return <Lab loading={remote.loading} error={remote.error} retry={remote.retry} id={id} title={titles[view]} description={masking ? "Inspect the mask, its multiplication, and its result in separate views." : "Use the topic buttons to inspect the network, calculations, and parameters."} controls={<>
        {masking ? <ControlGroup id="mask" title="Dropout settings">
            <Slider label="Drop probability p" value={s.dropoutP} min={0} max={0.9} step={0.05} onChange={p => s.newMask(p)} />
            <Choice label="Mask variant" value={s.dropoutVariant} options={["element", "feature"]} onChange={variant => s.newMask(s.dropoutP, variant)} />
            <Choice label="Network mode" value={s.training ? "Training" : "Inference"} options={["Training", "Inference"]} onChange={mode => s.patch({ training: mode === "Training" })} />
            <Button size="sm" onClick={() => s.newMask()}>Generate random mask</Button><ResetButtons reset={s.reset} />
        </ControlGroup> : <>
            <ControlGroup id="inputs" title={view === "xor" ? "XOR & inputs" : "Inputs"}>
                {view === "xor" && <Choice label="XOR model" value={s.xorMode} options={["single", "linear", "nonlinear"]} onChange={xorMode => { stop(); if (xorMode !== "single") void s.architecture(s.hidden, xorMode === "linear" ? "linear" : s.activation === "linear" ? "tanh" : s.activation); else void s.patch({ xorMode }); }} />}
                {s.input.map((value, i) => <NumberField key={i} label={`Input x${i + 1}`} value={value} min={-5} max={5} onChange={value => s.patch({ input: s.input.map((x, j) => i === j ? value : x) })} />)}
                {single && s.single.map((value, i) => <Slider key={i} label={i === 2 ? "Single neuron bias" : `Single neuron w${i + 1}`} value={value} min={-10} max={10} onChange={value => s.patch({ single: s.single.map((x, j) => i === j ? value : x) })} />)}
                {view === "xor" && <Button size="sm" variant="outline" onClick={s.loadXor}>Load XOR solution</Button>}
                <ResetButtons reset={s.reset} />
            </ControlGroup>
            {!single && <ControlGroup id="architecture" title="Architecture">
                <Choice label="Hidden activation" value={s.activation} options={activations} onChange={activation => s.architecture(s.hidden, activation)} />
                <Choice label="Hidden layer count" value={String(s.hidden.length)} options={["1", "2", "3"]} onChange={value => s.architecture(Array.from({ length: Number(value) }, (_, i) => s.hidden[i] ?? 2), s.activation)} />
                <ResetButtons reset={s.reset} randomize={s.randomize} />
            </ControlGroup>}
            {!single && <ControlGroup id="widths" title="Layer widths">
                {s.hidden.map((size, i) => <Choice key={i} label={`Hidden layer ${i + 1} neurons`} value={String(size)} options={["2", "3", "4"]} onChange={value => s.architecture(s.hidden.map((n, j) => i === j ? Number(value) : n), s.activation)} />)}
                <ResetButtons reset={s.reset} randomize={s.randomize} />
            </ControlGroup>}
            {!single && <ControlGroup id="inspect" title="Inspect neuron">
                <Choice label="Layer" value={String(l)} options={network.map((_, i) => String(i))} onChange={value => s.patch({ selected: { layer: Number(value), row: 0, column: 0 } })} />
                <Choice label="Neuron" value={String(row)} options={layer.biases.map((_, i) => String(i))} onChange={value => s.patch({ selected: { ...selected, row: Number(value), column: 0 } })} />
                <Slider label="Selected neuron bias" value={layer.biases[row]} min={-10} max={10} onChange={value => s.parameter({ ...selected, column: -1 }, value)} />
                <p className="text-xs text-slate-600">Inspect layer {l}, neuron {row}. Pre-activation z = {fmt(z)}.</p>
            </ControlGroup>}
            {view === "xor" && !single && <ControlGroup id="learning" title="Learning"><Slider label="Learning rate Î·" value={s.rate} min={0.01} max={2} step={0.01} onChange={rate => s.patch({ rate })} /><Playback playing={s.playing} onToggle={() => s.patch({ playing: !s.playing })} onStep={s.train} label="Train epoch" disabled={s.history.length >= 1000} /><ResetButtons reset={s.reset} randomize={s.randomize} /></ControlGroup>}
        </>}
    </>}>
        {view === "variants" && <Slide id="variants" title="Variants">{variants}</Slide>}
        {masking && <Slide id="mask" title="Mask"><Note>{s.dropoutVariant === "element" ? "Independent Bernoulli entries." : "One feature/channel entry is shared across positions."} Rows are spatial positions in one example; columns are channels.</Note><Card title="Mask M · click a cell to toggle"><Matrix values={s.mask} label="Mask" onSelect={s.toggleMask} /><p className="text-sm">1 = retained · 0 = dropped. Feature masks toggle the whole column.</p><p className="text-xs text-slate-500">Seed {s.maskSeed}. A finite random sample need not drop exactly p of its entries.</p></Card></Slide>}
        {masking && <Slide id="output" title="Output"><Card title={s.training ? "Training output" : "Inference output"}><div className="grid min-h-0 flex-1 grid-cols-2 gap-3"><Matrix values={s.dropoutValues} label="Activations A" /><Matrix values={dropped} label={s.training ? "A ⊙ M / (1 − p)" : "A (unchanged)"} /></div><Note>{s.training ? `Retained activations × ${fmt(result.scale)}. Dropped activations become zero.` : "No mask or scaling at inference."}</Note></Card></Slide>}
        {masking && <Slide id="activations" title="Edit activations"><Card title="Enter the activation matrix"><div className="grid gap-3 sm:grid-cols-2">{s.dropoutValues.flatMap((values, i) => values.map((value, j) => <NumberField key={`${i}-${j}`} label={`A[${i}][${j}]`} value={value} min={-5} max={5} onChange={value => s.patch({ dropoutValues: s.dropoutValues.map((row, r) => row.map((a, c) => r === i && c === j ? value : a)) })} />))}</div></Card></Slide>}
        {masking && <Slide id="multiplication" title="Multiplication"><Card title="One multiplication at a time"><PagedTable id={`${id}/products`} headers={["Position", "Activation", "Mask", "Calculation", "Result"]} rows={s.dropoutValues.flatMap((values, i) => values.map((a, j) => <tr key={`${i}-${j}`} className="border-t border-slate-100">{[`${i}, ${j}`, fmt(a), String(s.mask[i][j]), s.training ? `${fmt(a)} × ${s.mask[i][j]} / ${fmt(result.keep)}` : "Unchanged", fmt(dropped[i][j])].map((value, k) => <td key={k} className="p-2 font-mono">{value}</td>)}</tr>))} /></Card></Slide>}
        {view === "dropout" && <Slide id="variants" title="Variants">{variants}</Slide>}
        {view === "activation" && <Slide id="function" title="Function"><Card title={`${s.activation}: output and derivative`}><ActivationChart functions={r.curves} showDerivative /><p className="shrink-0 font-mono text-xs">z = {fmt(z)} · f(z) = {fmt(r.activations.find(item => item.name === s.activation)!.value)} · f′(z) = {fmt(r.activations.find(item => item.name === s.activation)!.derivative)}</p><p className="shrink-0 text-xs text-slate-500">Blue: activation · orange: derivative. Choose a function under Architecture; move the marker under Inspect neuron.</p></Card></Slide>}
        {view === "activation" && <Slide id="compare" title="Compare functions"><Card title="Common activations at the same input"><PagedTable id={`${id}/functions`} headers={["Function", "f(z)", "f′(z)", "Behavior"]} rows={r.activations.filter(item => item.name !== "linear").map(({ name: kind, value, derivative }) => <tr key={kind} className="border-t border-slate-100">{[kind, fmt(value), fmt(derivative), kind === "sigmoid" ? "Maps to (0, 1); saturates" : kind === "tanh" ? "Maps to (−1, 1); saturates" : kind === "hard tanh" ? "Clips to [−1, 1]" : "Keeps positive values"].map((value, k) => <td key={k} className="p-2">{value}</td>)}</tr>)} /><Note>Derivative 0 is chosen at ReLU’s corner z = 0 and hard tanh’s corners z = ±1.</Note></Card></Slide>}
        {view === "xor" && <Slide id="boundary" title="Decision boundary"><Note>{single ? "A single linear boundary cannot separate opposite XOR corners." : s.activation === "linear" ? "Composing affine layers still gives an affine transformation. Depth alone cannot solve XOR." : "Nonlinear hidden activations can combine regions to represent XOR."}</Note><Card title="XOR decision regions"><Boundary grid={r.boundary} samples={gates.XOR} input={s.input} onInput={input => s.patch({ input })} /><p className="shrink-0 text-sm font-semibold">{r.correct}/4 correct</p><p className="shrink-0 text-xs text-slate-500">Orange: class 0 · blue: class 1 · outline: p = 0.5. Click to inspect an input.</p></Card></Slide>}
        {view === "xor" && <Slide id="predictions" title="Predictions"><Card title="All four XOR predictions"><PagedTable id={`${id}/predictions`} headers={["Input", "Target", "p(1)", "Predicted"]} rows={r.predictions.map((sample, i) => <tr key={i} className="border-t border-slate-100"><td className="p-2"><Button size="sm" variant="outline" onClick={() => s.patch({ input: [...sample.x] })}>({sample.x.join(", ")})</Button></td><td className="p-2">{sample.y[0]}</td><td className="p-2">{fmt(sample.output)}</td><td className="p-2">{sample.prediction} {sample.correct ? "âœ“" : "âœ•"}</td></tr>)} /><p className="shrink-0 text-sm">Binary cross-entropy: {fmt(r.loss)}</p></Card></Slide>}
        {(view === "xor" || view === "forward") && <Slide id="network" title="Network"><Card title="One layer’s output becomes the next layer’s input"><NetworkChart network={network} trace={trace} selected={selected} onSelect={selection => { if (!single) s.patch({ selected: selection }); }} activeLayer={view === "forward" ? l : undefined} /><p className="shrink-0 text-xs text-slate-500">Blue: positive weight · orange: negative weight. Select a connection to inspect it under Parameters.</p></Card></Slide>}
        {view === "forward" && <Slide id="affine" title="Affine calculation"><Card title={`Layer ${l}: z = W a + b`}><div className="grid min-h-0 flex-1 grid-cols-2 gap-3"><Matrix label={`W[${l}]`} values={layer.weights} row={row} onSelect={(row, column) => s.patch({ selected: { layer: l, row, column } })} /><div className="space-y-3"><Vector label={`Input a[${l}]`} values={trace.a[l]} /><Vector label={`Bias b[${l}]`} values={layer.biases} /><Vector label={`Score z[${l}]`} values={trace.z[l]} /></div></div><p className="shrink-0 rounded-lg bg-blue-50 p-2 font-mono text-xs">Neuron {row}: {layer.weights[row].map((w, k) => `${fmt(w)} × ${fmt(trace.a[l][k])}`).join(" + ")} + ({fmt(layer.biases[row])}) = {fmt(z)}</p></Card></Slide>}
        {view === "forward" && <Slide id="activation" title="Apply activation"><Card title={`Layer ${l}: ${layer.activation}(z)`}><Vector label={`Pre-activation z[${l}]`} values={trace.z[l]} /><ActivationChart functions={r.layerCurves} /><Vector label={`Output a[${l + 1}]`} values={trace.a[l + 1]} /><p className="shrink-0 text-sm">{l < network.length - 1 ? `This vector is the input to layer ${l + 1}.` : "This is the network’s final output."}</p></Card></Slide>}
        {!masking && !single && <Slide id="parameters" title="Parameters"><Card title="Inspect and edit a weight or bias"><ParameterEditor network={network} selected={selected} onSelect={selected => s.patch({ selected })} onChange={s.parameter} /></Card></Slide>}
        {view === "xor" && !single && <Slide id="loss" title="Training loss"><Card title="Loss over training epochs"><LossHistory values={s.history} /><p className="shrink-0 text-xs text-slate-500">Full-batch gradient descent · {s.history.length} epochs. Try another initialization if training stalls.</p>{s.message && <Note>{s.message}</Note>}</Card></Slide>}
    </Lab>;
}

