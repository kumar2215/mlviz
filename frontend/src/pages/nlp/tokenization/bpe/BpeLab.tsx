import { useEffect, useState } from "react";
import { checkBpeMerge, loadBpeState, type BpePair, type BpeState } from "@/api/bpe";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { useDataset } from "@/store/useDataset";
import { useTokenization } from "@/store/nlp/useTextPreprocessing";
import type { BpeDataset, CustomBpeDataset } from "@/types/dataset";
import { actionClass, LabFrame, optionClass, Status } from "../../shared/LabFrame";
import BpeCorpusView from "./BpeCorpusView";

export default function BpeLab({ completionButtonId }: { completionButtonId: string }) {
    const activeDataset = useDataset(state => state.activeDataset);
    const [source, setSource] = useState<BpeDataset | null>(null);
    const [data, setData] = useState<BpeState | null>(null);
    const [draft, setDraft] = useState("");
    const [budget, setBudget] = useState(2);
    const [round, setRound] = useState(0);
    const [selected, setSelected] = useState<BpePair | null>(null);
    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState("Choose the most frequent pair, then merge it.");
    const saveSource = useTokenization(state => state.setBpeSource);
    const { recordButtonClick } = useHistoryRecorder();
    useEffect(() => {
        if (activeDataset?.type !== "predefined_bpe" && activeDataset?.type !== "custom_bpe") return;
        let active = true;
        const dataset = useTokenization.getState().bpeSource ?? activeDataset;
        setPending(true);
        loadBpeState(dataset).then(result => {
            if (active) { setSource(dataset); setData(result); setRound(0); setSelected(null); setDraft(result.initial.map(row => `${row.word} ${row.frequency}`).join("\n")); setBudget(dataset.type === "custom_bpe" ? dataset.rounds : result.rounds.length); }
        }).catch(reason => { if (active) setFeedback(reason instanceof Error ? reason.message : "Could not load corpus."); }).finally(() => { if (active) setPending(false); });
        return () => { active = false; };
    }, [activeDataset]);
    const useCorpus = async () => {
        if (!Number.isInteger(budget) || budget < 1 || budget > 6) { setFeedback("Choose a merge budget from 1 to 6."); return; }
        const lines = draft.trim().split(/\n+/).filter(Boolean);
        if (lines.some(line => line.trim().split(/\s+/).length > 2)) { setFeedback("Use one word and its frequency per line."); return; }
        const words = lines.map(line => { const [word, frequency = "1"] = line.trim().split(/\s+/); return { word, frequency: Number(frequency) }; });
        const candidate: CustomBpeDataset = { type: "custom_bpe", words, rounds: budget, test_words: data?.test_words ?? [], restore_word: null };
        setPending(true);
        try {
            const result = await loadBpeState(candidate);
            setSource(candidate); saveSource(candidate); setData(result); setRound(0); setSelected(null); setFeedback("Corpus updated. Pick a pair using the new counts.");
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not use this corpus."); }
        finally { setPending(false); }
    };
    const merge = async () => {
        if (!source || !selected || !data) return;
        setPending(true);
        try {
            const result = await checkBpeMerge(source, round, selected);
            if (!result.correct) { setFeedback("Choose the highest count. For a tie, use the alphabetically first pair."); return; }
            const next = round + 1;
            setRound(next); setSelected(null); saveSource(source);
            setFeedback(next === data.rounds.length ? "Training complete. Try the learned rules on new words." : "Merge applied throughout the corpus. Counts have changed; choose again.");
            if (next === data.rounds.length) recordButtonClick(completionButtonId);
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not check this merge."); }
        finally { setPending(false); }
    };
    const finished = Boolean(data) && round === data?.rounds.length;
    const current = data?.rounds[round];
    const finalRound = data?.rounds[(data?.rounds.length ?? 0) - 1];
    const corpus = current?.before ?? finalRound?.after ?? data?.initial ?? [];
    return <LabFrame>
        <div className="flex shrink-0 items-center justify-between"><h2 className="text-lg font-semibold">Learn BPE merges</h2><span className="text-sm text-blue-900">{finished ? "Model ready" : `Merge ${round + 1} of ${data?.rounds.length ?? "…"}`}</span></div>
        <div className="grid shrink-0 grid-cols-[1fr_auto] gap-3 rounded-lg bg-blue-50 p-2"><label className="min-w-0 text-sm font-medium">Corpus (word frequency, up to eight lines)<textarea aria-label="BPE corpus" rows={4} value={draft} disabled={pending} onChange={event => setDraft(event.target.value)} className="mt-1 w-full resize-none rounded-lg border border-blue-200 bg-white p-2 font-mono text-sm" /></label><div className="flex flex-col justify-between gap-2"><label className="text-sm">Merge budget<input aria-label="Merge budget" type="number" min="1" max="6" value={Number.isFinite(budget) ? budget : ""} disabled={pending} onChange={event => setBudget(event.target.valueAsNumber)} className="mt-1 block w-24 rounded-md border border-blue-200 bg-white px-2 py-1" /></label><Button className={actionClass} disabled={pending || !draft.trim()} onClick={useCorpus}>Use corpus</Button></div></div>
        <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] gap-3">
            <section className="min-h-0 overflow-auto rounded-xl border border-slate-200 p-2"><h3 className="mb-2 text-sm font-semibold">Current tokens</h3><BpeCorpusView corpus={corpus} /></section>
            <section className="flex min-h-0 flex-col gap-3 rounded-xl bg-blue-50 p-3"><h3 className="shrink-0 text-sm font-semibold">Weighted pair counts</h3><div className="min-h-0 flex-1 overflow-auto p-2"><div className="grid grid-cols-2 gap-2">{current?.counts.map(pair => <Button key={`${pair.left}-${pair.right}`} className={`${optionClass} min-h-10 justify-between px-3 py-2 font-mono ${selected?.left === pair.left && selected?.right === pair.right ? "ring-2 ring-blue-600" : ""}`} disabled={pending} onClick={() => setSelected({ left: pair.left, right: pair.right })}><span className="min-w-0 break-all text-xs">{pair.left} + {pair.right}</span><strong className="text-xs">{pair.count}</strong></Button>)}</div>{finished && <div className="grid gap-2">{data?.rounds.map((item, index) => <p key={index} className="rounded-lg bg-white p-2 font-mono text-sm">{index + 1}. {item.rule.left} + {item.rule.right} → {item.rule.left}{item.rule.right}</p>)}</div>}</div><Button className={actionClass} disabled={!selected || pending || finished} onClick={merge}>Merge selected pair</Button></section>
        </div>
        <Status success={finished}>{feedback}</Status>
    </LabFrame>;
}
