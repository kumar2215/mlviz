import { useEffect, useState } from "react";
import { applyBpePair, checkBpeTokenizations, loadBpeApplication, loadBpeState, type BpeApplication, type BpeState } from "@/api/bpe";
import { Button } from "@/components/ui/button";
import useHistoryRecorder from "@/hooks/useHistoryRecorder";
import { useDataset } from "@/store/useDataset";
import { useTokenization } from "@/store/nlp/useTextPreprocessing";
import type { CustomBpeDataset } from "@/types/dataset";
import { actionClass, LabFrame, optionClass, Status } from "../../shared/LabFrame";
import WordsEditor from "../../shared/WordsEditor";

export default function BpeApply({ completionButtonId }: { completionButtonId: string }) {
    const activeDataset = useDataset(state => state.activeDataset);
    const [source, setSource] = useState<CustomBpeDataset | null>(null);
    const [model, setModel] = useState<BpeState | null>(null);
    const [application, setApplication] = useState<BpeApplication | null>(null);
    const [draft, setDraft] = useState("");
    const [selected, setSelected] = useState<{ word: number; token: number } | null>(null);
    const [pending, setPending] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [feedback, setFeedback] = useState("Select a left token, then its right neighbour to apply the highlighted rule.");
    const saveSource = useTokenization(state => state.setBpeSource);
    const { recordButtonClick } = useHistoryRecorder();
    useEffect(() => {
        if (activeDataset?.type !== "predefined_bpe" && activeDataset?.type !== "custom_bpe") return;
        let active = true;
        const dataset = useTokenization.getState().bpeSource ?? activeDataset;
        setPending(true);
        loadBpeState(dataset).then(async result => {
            const words = result.test_words.length ? result.test_words : result.initial.slice(0, 3).map(item => item.word);
            const custom: CustomBpeDataset = { type: "custom_bpe", words: result.initial.map(item => ({ word: item.word, frequency: item.frequency })), rounds: dataset.type === "custom_bpe" ? dataset.rounds : result.rounds.length, test_words: words, restore_word: null };
            const next = await loadBpeApplication(custom);
            if (active) { setSource(custom); setModel(result); setApplication(next); setDraft(words.join(" ")); setSelected(null); }
        }).catch(reason => { if (active) setFeedback(reason instanceof Error ? reason.message : "Could not load learned rules."); }).finally(() => { if (active) setPending(false); });
        return () => { active = false; };
    }, [activeDataset]);
    const useWords = async () => {
        if (!source) return;
        const candidate = { ...source, test_words: draft.trim().split(/\s+/).filter(Boolean) };
        setPending(true);
        try {
            const next = await loadBpeApplication(candidate);
            setSource(candidate); saveSource(candidate); setApplication(next); setSelected(null); setCompleted(false); setFeedback("New words loaded with character boundaries.");
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not use these words."); }
        finally { setPending(false); }
    };
    const selectToken = async (word: number, token: number) => {
        if (!source || !application) return;
        if (!selected || selected.word !== word || selected.token === token) { setSelected({ word, token }); return; }
        setPending(true);
        try {
            const next = await applyBpePair({ dataset: source, answers: application.answers, rule_index: application.rule_index, word_index: word, left_index: selected.token, right_index: token });
            setApplication(next); setFeedback(next.message); setSelected(null);
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not apply this pair."); setSelected(null); }
        finally { setPending(false); }
    };
    const check = async () => {
        if (!source || !application) return;
        setPending(true);
        try {
            const result = await checkBpeTokenizations(source, application.answers);
            setFeedback(result.correct ? "All words use the learned rules." : "Some token boundaries still need a merge.");
            if (result.correct) { setCompleted(true); recordButtonClick(completionButtonId); }
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not check tokens."); }
        finally { setPending(false); }
    };
    return <LabFrame>
        <h2 className="shrink-0 text-lg font-semibold">Apply your learned merges</h2>
        <WordsEditor label="Test words (up to four)" value={draft} onChange={setDraft} onApply={useWords} pending={pending} />
        <div className="flex shrink-0 flex-wrap gap-2">{model?.rounds.map((item, index) => <span key={index} className={`rounded-lg border px-3 py-2 font-mono text-sm ${application?.rule_index === index ? "border-blue-600 bg-blue-100 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{index + 1}. {item.rule.left} + {item.rule.right}</span>)}</div>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-auto rounded-xl bg-slate-50 p-3">{application?.answers.map((answer, word) => <div key={answer.word} className="rounded-lg border border-blue-100 bg-white p-3"><h3 className="mb-2 font-mono font-semibold break-all">{answer.word}</h3><div className="flex flex-wrap gap-1">{answer.tokens.map((token, index) => <Button key={`${index}-${token}`} aria-label={`${answer.word} token ${index + 1}: ${token}`} disabled={pending || application.complete} className={`${optionClass} min-w-10 font-mono ${selected?.word === word && selected.token === index ? "ring-2 ring-blue-600" : ""}`} onClick={() => selectToken(word, index)}>{token}</Button>)}</div></div>)}</div>
        <div className="flex shrink-0 items-center justify-between gap-2"><span className="text-sm text-blue-900">{application?.complete ? "All applicable rules have been used." : `Apply rule ${(application?.rule_index ?? 0) + 1}.`}</span><Button className={actionClass} disabled={pending || !application?.complete || completed} onClick={check}>Check tokenization</Button></div>
        <Status success={completed}>{feedback}</Status>
    </LabFrame>;
}
