import { useEffect, useState } from "react";
import { loadPorterState, type PorterState } from "@/api/text_preprocessing";
import { useDataset } from "@/store/useDataset";
import { useTokenization } from "@/store/nlp/useTextPreprocessing";
import type { PorterDataset } from "@/types/dataset";
import useUserMode from "@/hooks/useUserMode";

export function usePorterExamples() {
    const { userMode } = useUserMode();
    const locked = userMode === "story";
    const activeDataset = useDataset(state => state.activeDataset);
    const [source, setSource] = useState<PorterDataset | null>(null);
    const [data, setData] = useState<PorterState | null>(null);
    const [draft, setDraft] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const saveWords = useTokenization(state => state.setPorterWords);
    useEffect(() => {
        if (activeDataset?.type !== "predefined_porter" && activeDataset?.type !== "custom_porter") return;
        let active = true;
        const saved = useTokenization.getState().porterWords;
        const dataset: PorterDataset = !locked && saved ? { type: "custom_porter", words: saved } : activeDataset;
        setPending(true);
        loadPorterState(dataset).then(result => {
            if (active) { setSource(dataset); setData(result); setDraft(result.examples.map(item => item.word).join(" ")); setError(""); }
        }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load words."); }).finally(() => { if (active) setPending(false); });
        return () => { active = false; };
    }, [activeDataset, locked]);
    const apply = async () => {
        if (locked) return false;
        const words = draft.trim().split(/[\s,]+/).filter(Boolean);
        setPending(true); setError("");
        try {
            const candidate: PorterDataset = { type: "custom_porter", words };
            const result = await loadPorterState(candidate);
            const normalized = result.examples.map(item => item.word);
            setSource({ type: "custom_porter", words: normalized }); setData(result); setDraft(normalized.join(" ")); saveWords(normalized);
            return true;
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not use these words."); return false; }
        finally { setPending(false); }
    };
    return { source, data, draft, setDraft, pending, error, apply };
}
