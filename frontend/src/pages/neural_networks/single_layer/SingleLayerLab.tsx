import { Button } from "@/components/ui/button";
import { useSingleLayer } from "@/store/neuralNetworks";
import { alphabet, languageNames } from "@/types/neuralNetworks";
import { fmt } from "@/utils/neuralNetworks";
import { NetworkChart } from "@/components/neural_networks/Charts";
import { Card, LabLoading, ControlGroup, Lab, Matrix, Note, PagedTable, ResetButtons, Slide, StageControls, Vector } from "@/components/neural_networks/Lab";
import { Choice, NumberField } from "@/components/input/NeuralInputs";


export default function SingleLayerLab({ view }: { view: "matrix" | "scores" | "language" | "features" }) {
    const remote = useSingleLayer();
    if (!remote.data || !remote.result) return <LabLoading error={remote.error} retry={remote.retry} />;
    const s = { ...remote.data, ...remote };
    const id = `single_layer/${view}`;
    const language = view === "language" || view === "features";
    const extracted = remote.result;
    const r = language ? extracted.language : extracted.numeric;
    const { input, trace, scores, probabilities, labels, row, winner } = r;
    const network = language ? s.languageNetwork : s.network;
    const binary = language && s.languageMode === "binary";
    const shownScores = scores;
    const weights = network[0].weights[row];
    const bias = network[0].biases[row];
    const titles = { matrix: "A single layer, several outputs", scores: "From class scores to probabilities", language: "Identify a language", features: "Inspect the evidence for each language" };
    const features = <Card title={`Feature contributions to ${labels[row]}`}><PagedTable id={`${id}/characters`} headers={["Character", "Count", "Frequency", "Weight", "Contribution"]} rows={alphabet.map((letter, i) => <tr key={letter} className={`border-t border-slate-100 ${s.feature === i ? "bg-blue-50" : ""}`}><td className="p-2"><button className="rounded px-2 py-1 font-semibold hover:bg-blue-100" onClick={() => s.patch({ feature: i })} aria-label={`Inspect character ${letter}`}>{letter}</button></td><td className="p-2">{extracted.counts[i]}</td><td className="p-2 font-mono">{fmt(input[i])}</td><td className="p-2 font-mono">{fmt(weights[i])}</td><td className="p-2 font-mono">{fmt(r.contributions[row][i])}</td></tr>)} /><p className="shrink-0 font-mono text-xs">Σ contributions + bias = {fmt(r.sums[row])} + ({fmt(bias)}) = {fmt(scores[row])}</p></Card>;
    return <Lab loading={remote.loading} error={remote.error} retry={remote.retry} id={id} title={titles[view]} description={language ? "Inspect text features, language scores, and predictions using the topic buttons." : "Every output neuron receives the same input. Each weight-matrix row defines one neuron."} controls={<>
        <ControlGroup id="inputs" title={language ? "Text & task" : "Inputs"}>
            {language ? <>
                <label className="block space-y-1 text-xs text-slate-700"><span>Your text</span><textarea aria-label="Text to identify" rows={4} value={s.text} maxLength={10000} onChange={event => s.patch({ text: event.target.value })} className="w-full resize-none rounded-lg border border-blue-200 bg-white p-2 text-sm" /></label>
                <Choice label="Classification task" value={s.languageMode} options={["binary", "multi"]} onChange={languageMode => s.patch({ languageMode, row: 0 })} />
                {binary && <Choice label="Binary output" value={s.decision} options={["step", "sigmoid"]} onChange={decision => s.patch({ decision })} />}
                <div className="flex flex-wrap gap-2">{["Hello, how are you today?", "Bonjour, comment allez vous?", "Guten Tag, wie geht es Ihnen?"].map((text, i) => <Button key={text} size="sm" variant="outline" onClick={() => s.patch({ text })}>{languageNames[i]} example</Button>)}</div>
            </> : s.input.map((value, i) => <NumberField key={i} label={`Input x${i + 1}`} value={value} onChange={value => s.patch({ input: s.input.map((x, j) => i === j ? value : x) })} />)}
            <ResetButtons reset={s.reset} randomize={language ? undefined : s.randomize} />
        </ControlGroup>
        <ControlGroup id="parameters" title="Weights & biases">
            <Choice label="Inspect output" value={labels[row]} options={labels} onChange={value => s.patch({ row: labels.indexOf(value) })} />
            {language ? <><Choice label="Character feature" value={alphabet[s.feature]} options={alphabet} onChange={value => s.patch({ feature: alphabet.indexOf(value) })} /><NumberField label={`Weight for ${alphabet[s.feature]}`} value={weights[s.feature]} min={-300} max={300} onChange={value => s.parameter(row, s.feature, value, true)} /></> : weights.map((value, i) => <NumberField key={i} label={`W[${row}][${i}]`} value={value} onChange={value => s.parameter(row, i, value)} />)}
            <NumberField label={`${labels[row]} bias`} value={bias} min={language ? -300 : -20} max={language ? 300 : 20} onChange={value => s.parameter(row, -1, value, language)} />
            <ResetButtons reset={s.reset} />
        </ControlGroup>
    </>}>
        {view === "features" && <Slide id="features" title="Contributions">{features}</Slide>}
        {view === "matrix" && <Slide id="network" title="Network"><Card title="One shared input, three outputs"><NetworkChart network={network} trace={trace} selected={{ layer: 0, row, column: 0 }} onSelect={selected => s.patch({ row: selected.row })} /><p className="shrink-0 text-xs text-slate-500">Select an output connection to highlight its matrix row.</p></Card></Slide>}
        {view === "matrix" && <Slide id="matrix" title="Matrix"><Card title="z = Wx + b"><div className="grid min-h-0 flex-1 grid-cols-2 gap-3"><Matrix label="Weight matrix W" values={network[0].weights} row={row} onSelect={row => s.patch({ row })} /><div className="space-y-3"><Vector label="Input x" values={input} /><Vector label="Bias b" values={network[0].biases} /><Vector label="Scores z" values={scores} highlight={row} /></div></div></Card></Slide>}
        {view !== "scores" && <Slide id="process" title={language ? "Text to output" : "Calculation"}><Card title={language ? "Text → features → scores → output" : "Compute one output row"}>
            <StageControls phase={s.phase} labels={language ? ["Text", "Features", "Scores", "Output"] : ["Input", "Multiply", "Add bias", "Output"]} onChange={phase => s.patch({ phase })} />
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 rounded-lg bg-blue-50 p-4 text-sm">
                {s.phase === 0 && (language ? <p className="break-words">{s.text || "Enter text to begin."}</p> : <Vector label="Input x" values={input} />)}
                {s.phase === 1 && (language ? <><p>Lowercase → count recognized letters → divide by {extracted.total || "the total"}.</p><p className="font-mono text-xs">x[{alphabet[s.feature]}] = {extracted.counts[s.feature]} / {extracted.total || "—"} = {fmt(input[s.feature])}</p><p className="text-xs text-slate-500">Spaces, punctuation, and letters outside the model alphabet are ignored.</p></> : <p className="font-mono text-xs">W[{row}] · x = {weights.map((w, k) => `${fmt(w)} × ${fmt(input[k])}`).join(" + ")} = {fmt(r.sums[row])}</p>)}
                {s.phase === 2 && <p className="font-mono text-xs">{labels[row]}: z = {fmt(r.sums[row])} + ({fmt(bias)}) = {fmt(scores[row])}</p>}
                {s.phase === 3 && (language && !extracted.total ? <p>No recognized letters. Enter text using the model’s alphabet.</p> : <><strong>Prediction: {labels[winner]}</strong><p className="font-mono text-xs">{binary ? `French score − English score = ${fmt(r.difference)}; ${s.decision}(z) = ${fmt(r.binaryOutput)}` : `argmax(z) = ${winner}; softmax(z)[${winner}] = ${fmt(probabilities[winner])}`}</p></>)}
            </div>
            {language && !extracted.total && <Note>No recognized letters. Enter text to get a prediction.</Note>}
        </Card></Slide>}
        <Slide id="probabilities" title="Probabilities"><Card title={binary ? "Two scores, one binary decision" : "Raw scores and softmax probabilities"}>
            {language && !extracted.total ? <Note>No recognized letters. Enter text to get a prediction.</Note> : <><div className="space-y-4">{labels.map((label, j) => <div key={label} className="grid grid-cols-[70px_minmax(0,1fr)_55px] items-center gap-2 text-sm"><span className={winner === j ? "font-semibold text-blue-800" : "text-slate-600"}>{label}</span><div><div className="h-5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${probabilities[j] * 100}%` }} /></div><p className="mt-1 font-mono text-xs text-slate-500">z{j} = {fmt(shownScores[j])}</p></div><span className="text-right font-mono text-xs">{(probabilities[j] * 100).toFixed(1)}%</span></div>)}</div><p className="text-sm font-semibold">Prediction: {labels[winner]}</p></>}
            {!language && <div className="grid gap-2">{scores.map((score, j) => <NumberField key={j} label={`Edit score z${j}`} value={score} min={-50} max={50} onChange={value => s.score(j, value)} />)}</div>}
            <p className="text-xs text-slate-500">Argmax chooses the largest score; softmax probabilities sum to 1. Multiclass ties select the first class. Binary mode chooses French at z ≥ 0 (sigmoid ≥ 0.5).</p>
        </Card></Slide>
        {view === "scores" && <Slide id="normalization" title="Normalization"><Card title="Inspect softmax normalization"><PagedTable id={`${id}/scores`} headers={["Class", "z", "z − max", "exp(z − max)", "p"]} rows={scores.map((score, i) => <tr key={i} className="border-t border-slate-100">{[labels[i], fmt(score), fmt(r.shifted[i]), fmt(r.exponentials[i]), fmt(probabilities[i])].map((value, k) => <td key={k} className="p-2 font-mono">{value}</td>)}</tr>)} /><p className="shrink-0 text-sm">Adding the same constant to every score preserves the probabilities. Subtracting the maximum makes exponentiation stable.</p><Button size="sm" variant="outline" onClick={s.shift}>Add 1 to every score</Button></Card></Slide>}
        {view === "language" && <Slide id="features" title="Contributions">{features}</Slide>}
        {language && <Slide id="model" title="Model"><Card title="How this example model works"><div className="space-y-3 text-sm text-slate-600"><p>A small bundled English/French/German corpus initializes a toy linear classifier using smoothed character frequencies.</p><p className="font-mono text-xs">weight = 40 × log(smoothed character frequency)</p><p>The model ignores character order. Compare contributions between languages: less negative scores are stronger.</p><p>Short, mixed, or unsupported-language text can produce misleading confidence. Character weights are editable under Weights & biases.</p></div></Card></Slide>}
    </Lab>;
}

