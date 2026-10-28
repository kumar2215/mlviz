import { Button } from "@/components/ui/button";
import { usePerceptron } from "@/store/neuralNetworks";
import { gates } from "@/types/neuralNetworks";
import { fmt } from "@/utils/neuralNetworks";
import { Boundary, Curves, NetworkChart } from "@/components/neural_networks/Charts";
import { Card, LabLoading, ControlGroup, Lab, Matrix, Note, PagedTable, Playback, ResetButtons, Slide, StageControls, Vector } from "@/components/neural_networks/Lab";
import { Choice, NumberField, Slider } from "@/components/input/NeuralInputs";
import { usePlayback } from "@/hooks/usePlayback";

const stop = () => usePerceptron.getState().patch({ playing: false });
const stages = ["Inputs", "Multiply", "Sum", "Add bias", "Activate"];

export default function PerceptronLab({ view }: { view: "intro" | "matrix" | "activation" | "updates" }) {
    const remote = usePerceptron();
    usePlayback(remote.data?.playing === true && view === "updates", remote.learn, stop);
    if (!remote.data || !remote.result) return <LabLoading error={remote.error} retry={remote.retry} />;
    const s = { ...remote.data, ...remote };
    const r = remote.result;
    const { z, output, prediction, equations } = r;
    const weights = s.network[0].weights[0];
    const bias = s.network[0].biases[0];
    const samples = gates[s.gate];
    const last = s.history[s.history.length - 1];
    const titles = { intro: "Inside a perceptron", matrix: "From inputs to an output", activation: "Step and sigmoid outputs", updates: "Learning through weight updates" };
    const descriptions = {
        intro: "Meet the inputs, weights, bias, and output of a single neuron. Change a value to explore each part’s role.",
        matrix: "Follow the numerical operations, then connect the expanded calculation to its matrix notation.",
        activation: "Compare how step and sigmoid transform the same score, and explore their classification boundaries.",
        updates: "Apply the perceptron learning rule and inspect how successive corrections move the decision boundary.",
    };
    return <Lab loading={remote.loading} error={remote.error} retry={remote.retry} id={`perceptron/${view}`} title={titles[view]} description={descriptions[view]} controls={<>
        {view === "activation" && <ControlGroup id="output" title="Output & threshold">
            <Choice label="Output function" value={s.output} options={["step", "sigmoid"]} onChange={output => s.patch({ output })} />
            {s.output === "sigmoid" && <Slider label="Classification threshold" value={s.threshold} min={0.05} max={0.95} step={0.05} onChange={threshold => s.patch({ threshold })} />}
            <p className="text-xs text-slate-600">Step assigns class 1 at z ≥ 0. Sigmoid assigns class 1 when its probability reaches the selected threshold.</p>
            <ResetButtons reset={s.reset} />
        </ControlGroup>}
        {view === "updates" && <ControlGroup id="learning" title="Learning">
            <Choice label="Training examples" value={s.gate} options={["AND", "OR", "XOR"]} onChange={gate => s.chooseSample(0, gate)} />
            <div className="flex flex-wrap gap-2">{samples.map((sample, i) => <Button key={i} size="sm" variant={!s.custom && s.sample === i ? "default" : "outline"} onClick={() => { stop(); s.chooseSample(i); }}>({sample.x.join(", ")}) → {sample.y[0]}</Button>)}</div>
            <Slider label="Learning rate η" value={s.rate} min={0.01} max={2} step={0.01} onChange={rate => s.patch({ rate })} />
            <Playback playing={s.playing} onToggle={() => s.patch({ playing: !s.playing })} onStep={s.learn} label="Update" disabled={s.history.length >= 1000} />
            <ResetButtons reset={s.reset} />
        </ControlGroup>}
        <ControlGroup id="inputs" title="Inputs">
            {s.input.map((value, i) => <NumberField key={i} label={`Input x${i + 1}`} value={value} onChange={value => s.patch({ input: s.input.map((x, j) => i === j ? value : x), custom: true, playing: false })} />)}
            {view === "updates" && <Choice label="Target y" value={String(s.target)} options={["0", "1"]} onChange={value => s.patch({ target: Number(value), custom: true, playing: false })} />}
            <ResetButtons reset={s.reset} />
        </ControlGroup>
        <ControlGroup id="parameters" title="Weights & bias">
            {weights.map((value, i) => <Slider key={i} label={`Weight w${i + 1}`} value={value} min={-10} max={10} onChange={value => s.parameter(i, value)} />)}
            <Slider label="Bias b" value={bias} min={-10} max={10} onChange={value => s.parameter(-1, value)} />
            <ResetButtons reset={s.reset} randomize={s.randomize} />
        </ControlGroup>
    </>}>
        {view === "intro" && <Slide id="neuron" title="Neuron">
            <Note>Two inputs connect to one output neuron. Each connection has a weight, and the neuron also has a bias.</Note>
            <Card title="Input → weighted sum → output"><NetworkChart network={s.network} trace={{ a: [s.input, [output]], z: [[z]] }} outputLabel={s.output} /><p className="shrink-0 font-mono text-xs">z = wᵀx + b = {fmt(z)}; output = {fmt(output)}; class = {prediction}</p></Card>
        </Slide>}
        {view === "intro" && <Slide id="parts" title="Parts & roles"><Card title="What does each part do?">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-blue-50 p-3"><dt className="font-semibold text-blue-950">Inputs x</dt><dd className="mt-2 text-slate-600">The feature values supplied to the neuron. Try changing one input while keeping the parameters fixed.</dd><dd className="mt-2 font-mono text-xs">x = [{s.input.map(fmt).join(", ")}]</dd></div>
                <div className="rounded-lg bg-blue-50 p-3"><dt className="font-semibold text-blue-950">Weights w</dt><dd className="mt-2 text-slate-600">The strength and direction of each input’s influence. A zero weight removes that input’s contribution.</dd><dd className="mt-2 font-mono text-xs">w = [{weights.map(fmt).join(", ")}]</dd></div>
                <div className="rounded-lg bg-blue-50 p-3"><dt className="font-semibold text-blue-950">Bias b</dt><dd className="mt-2 text-slate-600">An adjustable offset to the score, including when every input is zero.</dd><dd className="mt-2 font-mono text-xs">b = {fmt(bias)}</dd></div>
                <div className="rounded-lg bg-blue-50 p-3"><dt className="font-semibold text-blue-950">Output function</dt><dd className="mt-2 text-slate-600">Transforms the score into the neuron’s output. Step produces a binary value; sigmoid produces a value between 0 and 1.</dd><dd className="mt-2 font-mono text-xs">Current output = {fmt(output)}</dd></div>
            </dl>
        </Card></Slide>}
        {view === "matrix" && <Slide id="calculation" title="Calculation"><Card title="Follow the matrix calculation">
            <StageControls phase={s.phase} labels={stages} onChange={phase => s.patch({ phase })} />
            <div className="grid shrink-0 grid-cols-2 gap-3"><Vector label="x" values={s.input} /><Vector label="w" values={weights} /></div>
            <ol className="space-y-2">{equations.map((line, i) => <li key={i} className={`rounded-lg p-2 font-mono text-xs ${s.phase === i ? "bg-blue-100 text-blue-950 ring-1 ring-inset ring-blue-300" : "bg-slate-50 text-slate-500"}`}>{line}</li>)}</ol>
            <Button size="sm" variant="outline" onClick={() => s.patch({ phase: (s.phase + 1) % stages.length })}>Next operation →</Button>
        </Card></Slide>}
        {view === "matrix" && <Slide id="notation" title="Matrix notation"><Card title="The same computation in compact form">
            <p className="shrink-0 rounded-lg bg-blue-50 p-3 font-mono text-sm">z = wᵀx + b = {fmt(z)}</p>
            <div className="grid grid-cols-2 gap-3"><Matrix label="Row vector wᵀ" values={[weights]} /><Matrix label="Column vector x" values={s.input.map(value => [value])} /></div>
            <Note>A 1×2 row multiplied by a 2×1 column produces one scalar score. The bias is another scalar.</Note>
            <p className="font-mono text-xs">{equations[2]}</p><p className="font-mono text-xs">{equations[3]}</p>
            <p className="text-sm text-slate-600">The transpose turns the weight column w into the row wᵀ. Pair corresponding entries, multiply, and sum them before adding the bias.</p>
        </Card></Slide>}
        {view === "activation" && <Slide id="outputs" title="Output functions"><Card title="Same score, different outputs"><Curves domain={[-10, 10]} range={[-0.1, 1.1]} functions={r.curves} /><Note>At z = {fmt(z)}, step gives {r.step} and sigmoid gives {fmt(r.sigmoid)}. Sigmoid classification uses threshold {s.threshold}; step switches at z = 0.</Note></Card></Slide>}
        {(view === "activation" || view === "updates") && <Slide id="boundary" title="Decision boundary">
            {view === "updates" && <Note>Hard step at z = 0. {s.custom ? "Updating your custom input repeatedly." : `Cycling through ${s.gate} examples.`} Sigmoid gradient descent is covered under Training.</Note>}
            <Card title={view === "updates" ? "Boundary after each update" : "Inputs as points in a plane"}>
                <Boundary samples={samples} input={s.input} grid={view === "updates" ? r.hardBoundary : r.boundary} threshold={view === "activation" && s.output === "sigmoid" ? s.threshold : 0.5} onInput={input => s.patch({ input, custom: true, playing: false })} />
                <p className="shrink-0 text-xs text-slate-500">Orange: class 0 · blue: class 1. Click to try an input. {view === "updates" ? "Dashed grey: before the last update." : s.output === "sigmoid" ? `Background shows probability; the outline marks p = ${fmt(s.threshold)}.` : "The outline marks the step’s switch at z = 0."}</p>
                {view === "activation" && <Note>Selected input: z = {fmt(z)} → {s.output} output = {fmt(output)} → class {prediction}.</Note>}
                {view === "updates" && <p className="shrink-0 text-sm font-medium">Correct: {r.correct}/4</p>}
            </Card>
        </Slide>}
        {view === "updates" && <Slide id="correction" title="Weight correction"><Card title="The latest correction">{last ? <div className="space-y-3 text-sm"><p>Input ({last.x.join(", ")}) · target {last.target} · prediction {last.prediction}</p><p className="rounded-lg bg-blue-50 p-3 font-mono">error = {last.target} − {last.prediction} = {last.error}</p>{last.before.map((value, i) => <p key={i} className="font-mono text-xs">{i === 2 ? "b" : `w${i + 1}`}′ = {fmt(value)} + {fmt(last.rate)} × ({last.error}) × {i === 2 ? "1" : fmt(last.x[i])} = <strong>{fmt(last.after[i])}</strong></p>)}<p className="text-slate-500">A correct prediction leaves the parameters unchanged.</p></div> : <p className="text-sm text-slate-500">Apply an update to inspect the calculation.</p>}</Card></Slide>}
        {view === "updates" && <Slide id="history" title="Iterations"><Card title="Successive iterations"><PagedTable id="perceptron/updates/iterations" headers={["Iteration", "Input", "Target / prediction", "η", "w₁, w₂, b after update"]} rows={s.history.slice().reverse().map(item => <tr key={item.iteration} className="border-t border-slate-100"><td className="p-2">{item.iteration}</td><td className="p-2">{item.x.map(fmt).join(", ")}</td><td className="p-2">{item.target} / {item.prediction}</td><td className="p-2">{item.rate}</td><td className="p-2 font-mono">{item.after.map(fmt).join(", ")}</td></tr>)} /><p className="shrink-0 text-xs text-slate-500">Runs pause after 1,000 updates. XOR cannot be separated by one line.</p></Card></Slide>}
    </Lab>;
}

