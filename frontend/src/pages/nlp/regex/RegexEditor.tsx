import { useEffect, useState, type ReactNode } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import type { ActivityNarrationProps } from "@/types/page";
import { Button } from "@/components/ui/button";
import { checkRegex, previewRegex, type RegexFlag, type RegexGoal, type RegexPreview, type RegexState } from "@/api/text_preprocessing";
import { useTokenization } from "@/store/nlp/useTextPreprocessing";
import { actionClass, LabFrame, Status } from "../shared/LabFrame";
import useUserMode from "@/hooks/useUserMode";

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

export default function RegexEditor({ narration, data, goal, onComplete }: ActivityNarrationProps & { data: RegexState; goal?: RegexGoal; onComplete?: () => void }) {
    const { userMode } = useUserMode();
    const locked = userMode === "story";
    const saved = locked ? null : useTokenization.getState().regexDraft;
    const [editor, setEditor] = useState({ text: goal?.text ?? saved?.text ?? data.text, pattern: goal ? data.options[0].pattern : saved?.pattern ?? data.options[0].pattern, flags: goal ? [] as RegexFlag[] : saved?.flags ?? [] });
    const [preview, setPreview] = useState<RegexPreview | null>(null);
    const [previewPending, setPreviewPending] = useState(true);
    const [checking, setChecking] = useState(false);
    const [feedback, setFeedback] = useState("Updating matches…");
    const [passed, setPassed] = useState(false);
    const setDraft = useTokenization(state => state.setRegexDraft);
    const preset = data.options.find(option => option.pattern === editor.pattern)?.id ?? "custom";

    const edit = (update: Partial<typeof editor>) => {
        if (locked && update.text !== undefined) return;
        const next = { ...editor, ...update };
        setEditor(next); setPreview(null); setPassed(false); setPreviewPending(true);
        setFeedback("Updating matches…");
        if (!locked && !goal) setDraft(next);
    };
    useEffect(() => {
        if (!editor.text || !editor.pattern) {
            setPreview(null); setPreviewPending(false);
            setFeedback("Enter text and a pattern to see matches.");
            return;
        }
        let active = true;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const result = await previewRegex({ type: "custom_regex", text: editor.text }, editor.pattern, editor.flags, controller.signal);
                if (!active) return;
                setPreview(result);
                setFeedback(result.truncated ? "Showing the first 200 matches. Narrow the pattern or shorten the text." : `${result.matches.length} matches found.`);
            } catch (error) {
                if (active) setFeedback(error instanceof Error ? error.message : "Could not run the pattern.");
            } finally {
                if (active) setPreviewPending(false);
            }
        }, 250);
        return () => { active = false; clearTimeout(timer); controller.abort(); };
    }, [editor]);
    const check = async () => {
        if (!goal || !preview || previewPending || checking) return;
        setChecking(true);
        try {
            const result = await checkRegex({ type: "custom_regex", text: editor.text }, editor.pattern, editor.flags, goal.id);
            setFeedback(result.message); setPassed(result.correct);
            if (result.correct) onComplete?.();
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not check the pattern."); }
        finally { setChecking(false); }
    };
    return <LabFrame>
        <ActivityIntroduction narration={narration}><h2 className="shrink-0 text-lg font-semibold text-cyan-950">{goal ? "Regex challenges" : "Regex playground"}</h2></ActivityIntroduction>
        {goal && <section aria-label="Current objective" className="shrink-0 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Current objective</p>
            <h3 className="text-base font-semibold text-cyan-950">{goal.title}</h3>
        </section>}
        <div className="grid min-h-0 flex-1 grid-cols-[0.9fr_1.1fr] gap-3">
            <section className="flex min-h-0 flex-col gap-3 rounded-xl bg-cyan-50 p-3">
                <label className="text-sm font-medium">Text<textarea aria-label="Regex text" rows={5} maxLength={2000} value={editor.text} readOnly={locked} disabled={checking} onChange={event => edit({ text: event.target.value })} className="mt-1 w-full resize-none rounded-lg border border-cyan-200 bg-white p-2 font-mono text-sm" />{locked && <span className="text-xs font-normal text-slate-600">This text is fixed for this story. Try your own in visualisation mode.</span>}</label>
                <label className="text-sm font-medium">Pattern preset<select aria-label="Pattern preset" value={preset} disabled={checking} onChange={event => edit({ pattern: data.options.find(option => option.id === event.target.value)?.pattern ?? "" })} className="mt-1 w-full rounded-lg border border-cyan-200 bg-white p-2 text-sm">{data.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}<option value="custom">Custom pattern</option></select></label>
                <label className="text-sm font-medium">Editable pattern<input aria-label="Regex pattern" maxLength={256} value={editor.pattern} disabled={checking} onChange={event => edit({ pattern: event.target.value })} className="mt-1 w-full rounded-lg border border-cyan-200 bg-white p-2 font-mono text-sm" /></label>
                <div className="flex flex-wrap gap-2 text-xs">{(["IGNORECASE", "MULTILINE", "DOTALL"] as const).map(flag => <label key={flag} className="flex items-center gap-1"><input type="checkbox" checked={editor.flags.includes(flag)} disabled={checking} onChange={event => edit({ flags: event.target.checked ? [...editor.flags, flag] : editor.flags.filter(item => item !== flag) })} />{flag}</label>)}</div>
                {goal && <div className="mt-auto flex shrink-0 flex-wrap gap-2"><Button className={actionClass} disabled={checking || previewPending || !preview} onClick={check}>{checking ? "Checking…" : "Check objective"}</Button></div>}
            </section>
            <section className="flex min-h-0 flex-col gap-3 rounded-xl border border-cyan-100 p-3">
                <h3 className="shrink-0 font-semibold">Matched text</h3>
                <div aria-busy={previewPending} className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-50 p-3">{preview ? <HighlightedText text={editor.text} preview={preview} /> : <span className="text-sm text-slate-500">{previewPending ? "Updating matches…" : "No current preview."}</span>}</div>
                <h3 className="shrink-0 font-semibold">Tokens</h3>
                <div className="min-h-0 flex-1 overflow-auto"><div className="flex flex-wrap gap-2">{preview?.matches.map((match, index) => <span key={index} className="max-w-full break-all rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 font-mono text-sm">{match.text || "∅"}</span>)}</div></div>
            </section>
        </div>
        <Status success={passed}>{feedback}</Status>
    </LabFrame>;
}
