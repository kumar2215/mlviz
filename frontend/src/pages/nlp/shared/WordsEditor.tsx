import { Button } from "@/components/ui/button";
import useUserMode from "@/hooks/useUserMode";
import { actionClass } from "./LabFrame";

interface WordsEditorProps {
    value: string;
    onChange: (value: string) => void;
    onApply: () => void;
    pending: boolean;
    label?: string;
}

export default function WordsEditor({ value, onChange, onApply, pending, label = "Words (up to six)" }: WordsEditorProps) {
    const { userMode } = useUserMode();
    const locked = userMode === "story";
    return <div className="shrink-0 rounded-lg bg-blue-50 p-2">
        <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-sm font-medium">{label}
                <input aria-label={label} value={value} readOnly={locked} disabled={pending}
                    onChange={event => { if (!locked) onChange(event.target.value); }}
                    className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm" />
            </label>
            {!locked && <Button className={actionClass} disabled={pending || !value.trim()} onClick={onApply}>{pending ? "Loading…" : "Use words"}</Button>}
        </div>
        {locked && <p className="mt-1 text-xs text-slate-600">These words are fixed for this story. Try your own in visualisation mode.</p>}
    </div>;
}
