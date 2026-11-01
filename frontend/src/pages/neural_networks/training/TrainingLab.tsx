import { Button } from "@/components/ui/button";
import { useTraining } from "@/store/neuralNetworks";
import { gates } from "@/types/neuralNetworks";
import { losses } from "@/types/neuralNetworks";
import { fmt } from "@/utils/neuralNetworks";
import { Curves, LossHistory, NetworkChart } from "@/components/neural_networks/Charts";
import { Card, LabLoading, ControlGroup, Lab, Matrix, Note, PagedTable, ParameterEditor, Playback, ResetButtons, Slide, StageControls, Vector } from "@/components/neural_networks/Lab";
import { Choice, NumberField, Slider } from "@/components/input/NeuralInputs";
import { parameterName } from "@/utils/neuralParameters";
import { usePlayback } from "@/hooks/usePlayback";

const stop = () => useTraining.getState().patch({ playing: false });

export function LossExplorer() {
    const remote = useTraining();
    if (!remote.data || !remote.result) return <LabLoading error={remote.error} retry={remote.retry} />;
    const s = { ...remote.data, ...remote };
    const r = remote.result;
    const categorical = s.explorerLoss === "Categorical cross-entropy";
    const binary = s.explorerLoss === "Binary cross-entropy";
    const { probabilities, target, formula } = r;
    const loss = r.explorerValue;
    return <Lab loading={remote.loading} error={remote.error} retry={remote.retry} id="training/loss" title="Measure a prediction’s error" description="Compare the loss curve, its calculation, and suitable output types using the topic buttons." controls={<ControlGroup id="loss" title="Loss settings">
        <Choice label="Loss function" value={s.explorerLoss} options={losses} onChange={explorerLoss => s.patch({ explorerLoss, lossPrediction: 0.6, lossTarget: 1 })} />
        {categorical ? <><Choice label="Correct class" value={String(s.lossClass)} options={["0", "1", "2"]} onChange={value => s.patch({ lossClass: Number(value) })} />{s.lossScores.map((score, i) => <Slider key={i} label={`Class ${i} score`} value={score} onChange={value => s.patch({ lossScores: s.lossScores.map((z, j) => i === j ? value : z) })} />)}</> : <><Slider label={binary ? "Predicted probability p" : "Prediction ŷ"} value={s.lossPrediction} min={binary ? 0.001 : -2} max={binary ? 0.999 : 2} step={0.001} onChange={lossPrediction => s.patch({ lossPrediction })} />{binary ? <Choice label="Target class" value={String(s.lossTarget)} options={["0", "1"]} onChange={value => s.patch({ lossTarget: Number(value) })} /> : <Slider label="Target y" value={s.lossTarget} min={-2} max={2} onChange={lossTarget => s.patch({ lossTarget })} />}</>}
        <ResetButtons reset={s.reset} />
    </ControlGroup>}>
        <Slide id="curve" title="Loss curve"><Card title={s.explorerLoss}><Curves domain={binary || categorical ? [0.001, 0.999] : [-2, 2]} xLabel={categorical ? "Probability of the correct class" : binary ? "Predicted probability" : "Prediction ŷ"} yLabel="Loss" functions={r.curves} /><p className="shrink-0 rounded-lg bg-blue-50 p-3 font-mono text-sm">{formula} = <strong>{fmt(loss)}</strong></p></Card></Slide>
        <Slide id="calculation" title="Calculation"><Card title="Substitute your values into the loss">{categorical ? <div className="grid grid-cols-2 gap-3"><Vector label="Raw scores" values={s.lossScores} /><Vector label="Softmax probabilities" values={probabilities} /><Vector label="One-hot target" values={target} /><Vector label="Per-class loss contribution" values={r.contributions} /></div> : <div className="grid grid-cols-2 gap-3"><Vector label="Prediction" values={[s.lossPrediction]} /><Vector label="Target" values={[s.lossTarget]} /></div>}<Note>{formula} = {fmt(loss)}</Note><p className="text-sm text-slate-600">MSE and MAE average over output elements. Categorical cross-entropy sums over classes. A training batch averages sample losses.</p></Card></Slide>
        <Slide id="compare" title="Compare losses"><Card title="Choose a loss for the output"><PagedTable id="training/loss/comparison" headers={["Loss", "Typical task", "Output"]} rows={[
            ["MSE", "Regression; squared error penalty", "Real-valued prediction"], ["MAE", "Regression; linear error penalty", "Real-valued prediction"],
            ["Binary cross-entropy", "Two-class classification", "One sigmoid probability"], ["Categorical cross-entropy", "One of several exclusive classes", "Softmax probability vector"],
        ].map(values => <tr key={values[0]} className="border-t border-slate-100">{values.map(value => <td key={value} className="p-2">{value}</td>)}</tr>)} /></Card></Slide>
    </Lab>;
}
export default function TrainingLab({ view }: { view: "chain" | "backward" | "updates" }) {
    const remote = useTraining();
    usePlayback(remote.data?.playing === true, remote.next, stop);
    if (!remote.data || !remote.result) return <LabLoading error={remote.error} retry={remote.retry} />;
    const s = { ...remote.data, ...remote };
    const r = remote.result;
    const id = `training/${view}`;
    const { analysis, batch, afterLoss, value, grad, sampleGrad, incoming, delta } = r;
    const selected = s.selected;
    const { layer: l, row: j, column: k } = selected;
    const last = l === s.network.length - 1;
    const titles = { chain: "Trace the chain rule through a network", backward: "Propagate gradients backward", updates: "Preview and apply gradient descent" };
    return <Lab loading={remote.loading} error={remote.error} retry={remote.retry} id={id} title={titles[view]} description="Inspect a 2–2–1 sigmoid network one view at a time. Select a weight or bias under Parameters." controls={<>
        <ControlGroup id="inputs" title="Inputs & target">
            {s.input.map((value, i) => <NumberField key={i} label={`Input x${i + 1}`} value={value} min={-5} max={5} onChange={value => s.configure({ input: s.input.map((x, j) => i === j ? value : x) })} />)}
            <Slider label="Target y" value={s.target[0]} min={0} max={1} step={0.1} onChange={value => s.configure({ target: [value] })} />
            <div className="flex flex-wrap gap-2">{gates.XOR.map((sample, i) => <Button key={i} size="sm" variant="outline" onClick={() => s.configure({ input: [...sample.x], target: [...sample.y] })}>({sample.x.join(", ")}) → {sample.y[0]}</Button>)}</div>
            <ResetButtons reset={s.reset} randomize={s.randomize} />
        </ControlGroup>
        <ControlGroup id="learning" title="Learning">
            <Choice label="Network loss" value={s.loss} options={["Binary cross-entropy", "MSE", "MAE"]} onChange={loss => s.configure({ loss })} />
            <Choice label="Update objective" value={s.batch ? "XOR batch" : "Selected sample"} options={["Selected sample", "XOR batch"]} onChange={value => s.configure({ batch: value === "XOR batch" })} />
            <Slider label="Learning rate η" value={s.rate} min={0.001} max={3} step={0.001} onChange={rate => s.patch({ rate })} />
            <Playback playing={s.playing} onToggle={() => s.patch({ playing: !s.playing })} onStep={s.next} label={s.phase === 3 ? "Apply update" : "Next phase"} disabled={s.history.length >= 1001} />
            <ResetButtons reset={s.reset} randomize={s.randomize} />
            <p className="text-xs text-slate-500">Play cycles through all four phases, up to 1,000 updates.</p>
        </ControlGroup>
    </>}>
        <Slide id="network" title="Network"><Card title="Forward → loss → backward → update"><StageControls phase={s.phase} labels={["Forward", "Loss", "Backward", "Update preview"]} onChange={phase => s.patch({ phase, playing: false })} /><NetworkChart network={s.network} trace={analysis} selected={selected} onSelect={selected => s.patch({ selected })} gradients={s.phase >= 2 ? analysis.gradients.map(g => g.weights) : undefined} activeLayer={s.phase === 0 ? l : undefined} /><Note>{s.phase === 0 ? `Forward pass: ŷ = ${fmt(analysis.a[analysis.a.length - 1][0])}.` : s.phase === 1 ? `Sample loss = ${fmt(analysis.loss)}. Objective loss = ${fmt(batch.loss)}.` : s.phase === 2 ? "Edges show signed sample gradients. Inspect their calculation under Selected gradient." : `Preview loss: ${fmt(batch.loss)} → ${fmt(afterLoss)} at η = ${fmt(s.rate)}. Not applied yet.`}</Note></Card></Slide>
        {view === "chain" && <Slide id="review" title="Chain rule"><Card title="A derivative follows every dependency"><div className="space-y-4 text-sm"><p>For L(a(z(w))), multiply the local derivatives:</p><p className="rounded-lg bg-blue-50 p-3 font-mono text-xs">∂L/∂w = (∂L/∂a) × (∂a/∂z) × (∂z/∂w)</p><p>If a parameter influences several downstream neurons, sum the contribution of every path. Backpropagation reuses these intermediate derivatives.</p><p className="font-mono text-xs">zⱼ = Σ wⱼₖaₖ + bⱼ; ∂zⱼ/∂wⱼₖ = aₖ; ∂zⱼ/∂bⱼ = 1</p></div></Card></Slide>}
        <Slide id="derivative" title="Selected gradient"><Card title={`Chain rule for ${parameterName(selected)}`}>
            <p className="rounded-lg bg-blue-50 p-3 font-mono text-xs">∂L/∂{k < 0 ? "b" : "w"} = δ[{l}][{j}] × {k < 0 ? "1" : `a[${l}][${k}]`} = {fmt(delta)} × {fmt(incoming)} = <strong>{fmt(sampleGrad)}</strong></p>
            <p className="font-mono text-xs">z = {fmt(analysis.z[l][j])} · sigmoid(z) = {fmt(analysis.a[l + 1][j])} · sigmoid′(z) = {fmt(r.derivative)}</p>
            {last ? <p className="rounded-lg bg-slate-50 p-3 font-mono text-xs">{s.loss === "Binary cross-entropy" ? `BCE + sigmoid: δ = ŷ − y = ${fmt(analysis.a[l + 1][j])} − ${fmt(s.target[j])} = ${fmt(delta)}` : s.loss === "MSE" ? `δ = 2(ŷ − y) × sigmoid′(z) = ${fmt(delta)}` : `δ = sign(ŷ − y) × sigmoid′(z) = ${fmt(delta)}`}</p> : <>
                <p className="font-mono text-xs">δ[{l}][{j}] = (Σᵣ W[{l + 1}][r][{j}] × δ[{l + 1}][r]) × sigmoid′(z[{l}][{j}])</p>
                {s.network[l + 1].weights.map((row, pathIndex) => <p key={pathIndex} className="rounded-lg bg-slate-50 p-2 font-mono text-xs">Path through neuron {pathIndex}: {fmt(row[j])} × {fmt(analysis.deltas[l + 1][pathIndex])} = {fmt(r.paths[pathIndex])}</p>)}
                <p className="font-mono text-xs">Multiply the path sum by {fmt(r.derivative)} → δ = {fmt(delta)}</p>
            </>}
            {s.batch && <Note>The calculation above is for the selected sample. Updates use the four-sample XOR mean gradient: {fmt(grad)}.</Note>}
        </Card></Slide>
        {view !== "chain" && <Slide id="gradients" title="All gradients"><Card title="Every weight and bias gradient"><div className="grid min-h-0 flex-1 grid-cols-2 gap-3">{batch.gradients.map((gradient, l) => <div key={l} className="min-w-0 space-y-3"><Matrix label={`∂L/∂W[${l}]${s.batch ? " · batch mean" : ""}`} values={gradient.weights} row={selected.layer === l ? selected.row : -1} onSelect={(row, column) => s.patch({ selected: { layer: l, row, column } })} /><Vector label={`∂L/∂b[${l}]`} values={gradient.biases} /><Vector label={`Sample δ[${l}]`} values={analysis.deltas[l]} /></div>)}</div></Card></Slide>}
        <Slide id="parameters" title="Parameters"><Card title="Select and edit a weight or bias"><ParameterEditor network={s.network} selected={selected} onSelect={selected => s.patch({ selected })} onChange={s.parameter} /></Card></Slide>
        <Slide id="update" title="Update"><Card title="Preview the parameter update"><p className="rounded-lg bg-blue-50 p-3 font-mono text-sm">{parameterName(selected)}′ = {fmt(value)} − {fmt(s.rate)} × ({fmt(grad)}) = <strong>{fmt(r.updatedValue)}</strong></p><p className="text-sm">Proposed objective loss: {fmt(batch.loss)} → {fmt(afterLoss)}.</p><p className="text-sm text-slate-600">Changing η updates the proposal immediately. A large step can increase loss.</p><div className="flex flex-wrap gap-2"><Button onClick={() => { stop(); s.apply(); }}>Apply gradient update</Button><Button variant="outline" onClick={s.randomize}>New parameters</Button></div>{s.message && <Note>{s.message}</Note>}</Card></Slide>
        <Slide id="all-updates" title="Update table"><Card title="Current and proposed values"><PagedTable id={`${id}/updates`} headers={["Parameter", "Current", "Gradient", "−η × gradient", "Proposed"]} rows={r.updates.map(item => <tr key={item.name} className="border-t border-slate-100">{[item.name, fmt(item.value), fmt(item.grad), fmt(item.change), fmt(item.proposed)].map((value, k) => <td key={k} className="p-2 font-mono">{value}</td>)}</tr>)} /></Card></Slide>
        <Slide id="loss" title="Loss history"><Card title="Loss after each applied update"><LossHistory values={s.history} />{s.message && <Note>{s.message}</Note>}</Card></Slide>
    </Lab>;
}

