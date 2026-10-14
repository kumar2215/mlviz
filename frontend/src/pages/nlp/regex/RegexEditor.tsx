import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { checkRegex, previewRegex, type RegexFlag, type RegexGoal, type RegexPreview, type RegexState } from "@/api/text_preprocessing";
import { useTokenization } from "@/store/nlp/useTextPreprocessing";
import { actionClass, LabFrame, Status } from "../shared/LabFrame";

function HighlightedText({ text, preview }: { text: string; preview: RegexPreview }) {
    const parts: ReactNode[] = [];
    let cursor = 0;
    preview.matches.forEach((match, index) => {
        parts.push(text.slice(cursor, match.start));
        parts.push(<mark key={index} className="rounded bg-cyan-200 px-0.5 text-cyan-950">{match.text || "∅"}</mark>);
        cursor = match.end;
    });
    parts.push(text.slice(cursor));
    return <p className="whitespace-pre-wrap break-all font-mono text-sm leading-7">{parts}</p>;
}

export default function RegexEditor({ data, goal, onComplete }: { data: RegexState; goal?: RegexGoal; onComplete?: () => void }) {
    const saved = useTokenization.getState().regexDraft;
    const [editor, setEditor] = useState({ text: goal?.text ?? saved?.text ?? data.text, pattern: goal ? data.options[0].pattern : saved?.pattern ?? data.options[0].pattern, flags: goal ? [] as RegexFlag[] : saved?.flags ?? [] });
    const [preview, setPreview] = useState<RegexPreview | null>(null);
    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState("Run a pattern to see its matches.");
    const [passed, setPassed] = useState(false);
    const setDraft = useTokenization(state => state.setRegexDraft);
    const preset = data.options.find(option => option.pattern === editor.pattern)?.id ?? "custom";

    const edit = (update: Partial<typeof editor>) => {
        const next = { ...editor, ...update };
        setEditor(next); setPreview(null); setPassed(false);
        setFeedback("Input changed. Test the pattern again.");
        if (!goal) setDraft(next);
    };
    const run = async () => {
        setPending(true); setPreview(null);
        try {
            const result = await previewRegex({ type: "custom_regex", text: editor.text }, editor.pattern, editor.flags);
            setPreview(result);
            setFeedback(result.truncated ? "Showing the first 200 matches. Narrow the pattern or shorten the text." : `${result.matches.length} matches found.`);
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not run the pattern."); }
        finally { setPending(false); }
    };
    const check = async () => {
        if (!goal) return;
        setPending(true);
        try {
            const result = await checkRegex({ type: "custom_regex", text: editor.text }, editor.pattern, editor.flags, goal.id);
            setFeedback(result.message); setPassed(result.correct);
            if (result.correct) onComplete?.();
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not check the pattern."); }
        finally { setPending(false); }
    };
    return <LabFrame>
        <h2 className="shrink-0 text-lg font-semibold text-cyan-950">{goal?.title ?? "Regex playground"}</h2>
        <div className="grid min-h-0 flex-1 grid-cols-[0.9fr_1.1fr] gap-3">
            <section className="flex min-h-0 flex-col gap-3 rounded-xl bg-cyan-50 p-3">
                <label className="text-sm font-medium">Text<textarea aria-label="Regex text" rows={5} maxLength={2000} value={editor.text} disabled={pending} onChange={event => edit({ text: event.target.value })} className="mt-1 w-full resize-none rounded-lg border border-cyan-200 bg-white p-2 font-mono text-sm" /></label>
                <label className="text-sm font-medium">Pattern preset<select aria-label="Pattern preset" value={preset} disabled={pending} onChange={event => edit({ pattern: data.options.find(option => option.id === event.target.value)?.pattern ?? "" })} className="mt-1 w-full rounded-lg border border-cyan-200 bg-white p-2 text-sm">{data.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}<option value="custom">Custom pattern</option></select></label>
                <label className="text-sm font-medium">Editable pattern<input aria-label="Regex pattern" maxLength={256} value={editor.pattern} disabled={pending} onChange={event => edit({ pattern: event.target.value })} className="mt-1 w-full rounded-lg border border-cyan-200 bg-white p-2 font-mono text-sm" /></label>
                <div className="flex flex-wrap gap-2 text-xs">{(["IGNORECASE", "MULTILINE", "DOTALL"] as const).map(flag => <label key={flag} className="flex items-center gap-1"><input type="checkbox" checked={editor.flags.includes(flag)} disabled={pending} onChange={event => edit({ flags: event.target.checked ? [...editor.flags, flag] : editor.flags.filter(item => item !== flag) })} />{flag}</label>)}</div>
                <div className="mt-auto flex shrink-0 flex-wrap gap-2"><Button className={actionClass} disabled={pending || !editor.text || !editor.pattern} onClick={run}>{pending ? "Working…" : "Test pattern"}</Button>{goal && <Button className={actionClass} disabled={pending || !preview} onClick={check}>Check objective</Button>}</div>
            </section>
            <section className="flex min-h-0 flex-col gap-3 rounded-xl border border-cyan-100 p-3">
                <h3 className="shrink-0 font-semibold">Matched text</h3>
                <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-50 p-3">{preview ? <HighlightedText text={editor.text} preview={preview} /> : <span className="text-sm text-slate-500">No current preview.</span>}</div>
                <h3 className="shrink-0 font-semibold">Tokens</h3>
                <div className="min-h-0 flex-1 overflow-auto"><div className="flex flex-wrap gap-2">{preview?.matches.map((match, index) => <span key={index} className="max-w-full break-all rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 font-mono text-sm">{match.text || "∅"}</span>)}</div></div>
            </section>
        </div>
        <Status success={passed}>{feedback}</Status>
    </LabFrame>;
}
