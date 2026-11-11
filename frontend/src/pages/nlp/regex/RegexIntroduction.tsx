import { useEffect, useState } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import { Button } from "@/components/ui/button";
import type { IndexPageProps } from "@/types/page";
import { actionClass, LabFrame, optionClass } from "../shared/LabFrame";

const sections = ["Text & tokens", "Pattern symbols", "Flags"] as const;
const introductions = [
    "See how a pattern finds text and turns each match into a token.",
    "Explore the symbols that let a pattern find letters, words, and other pieces of text.",
    "Choose a flag example, then switch the flag on and off to compare its matches. The sample pattern and text stay fixed.",
] as const;
const terms = [
    ["Pattern", "A rule that tells the editor what to find. A regular expression (regex) is one way to write that rule."],
    ["Match", "A piece of text found by the pattern. The pattern cat finds cat in The cat naps."],
    ["Token", "A piece of text kept for further processing. In this editor, each whole match becomes one token; everything else is left out."],
] as const;

const symbols = [
    ["Literal", "cat", "Ordinary letters match themselves: cat finds cat."],
    ["Character class / range", "[A-Za-z]", "Matches one English letter. Square brackets list allowed characters; A-Z is a range."],
    ["Negated class", "[^\\w\\s]", "A ^ first inside brackets means anything except these characters: here, neither word characters nor whitespace."],
    ["Character shorthand", "\\w  \\d  \\s", "One word character, decimal digit, or whitespace character. Uppercase \\W, \\D, and \\S mean their opposites."],
    ["Quantifier", "+  *  ?  {2,}", "Repeats the preceding item: one or more, zero or more, optional, or at least two times. \\d+ keeps consecutive digits together."],
    ["Wildcard", ".", "Matches one character, except a newline by default. DOTALL lets it match a newline too."],
    ["Escape", "\\.", "A backslash can give a symbol its literal meaning: \\. matches a period, whereas . is a wildcard."],
    ["Anchor / boundary", "^  $  \\b", "Matches a position, without consuming a character: start, end, or word boundary. MULTILINE changes ^ and $."],
    ["Group", "(cat)  (?:cat)", "Parentheses treat a sequence as one item. (...) also captures it for later use; (?:...) groups without capturing."],
    ["Alternation (OR)", "cat|dog", "Matches either cat or dog. Each complete match becomes a token in the editor."],
] as const;

const flagExamples = [
    {
        name: "IGNORECASE", inline: "i", pattern: "cat", text: "Cat cat CAT",
        meaning: "Ignore differences between uppercase and lowercase letters.",
        off: ["cat"], on: ["Cat", "cat", "CAT"],
        explanation: "The same pattern can now find all three spellings.",
    },
    {
        name: "MULTILINE", inline: "m", pattern: "^cat", text: "cat\ncat",
        meaning: "Let ^ match the start of each line and $ match the end of each line. Normally they refer to the whole text's boundaries.",
        off: ["cat"], on: ["cat", "cat"],
        explanation: "^cat now finds cat at the start of both lines. This flag changes anchors; it does not change the dot (.).",
    },
    {
        name: "DOTALL", inline: "s", pattern: "hello.*world", text: "hello\nworld",
        meaning: "Let the dot (.) match newline characters as well as other characters.",
        off: [], on: ["hello\nworld"],
        explanation: "The .* part can now cross the line break, so the entire text becomes one match.",
    },
] as const;

type Props = Pick<IndexPageProps, "narration" | "subpageIndex" | "onSubpageReady" | "onComplete">;

export default function RegexIntroduction({ narration, subpageIndex = 0, onSubpageReady, onComplete }: Props) {
    const section = sections[subpageIndex];
    const activeNarration = subpageIndex === 0 ? narration : undefined;
    const [flagIndex, setFlagIndex] = useState(0);
    const [enabled, setEnabled] = useState(false);
    const flag = flagExamples[flagIndex];
    const matches = enabled ? flag.on : flag.off;

    useEffect(() => {
        if (!section || activeNarration?.loading) return;
        onSubpageReady?.();
        if (subpageIndex === sections.length - 1) onComplete();
    }, [section, subpageIndex, activeNarration?.loading, onSubpageReady, onComplete]);

    return <LabFrame>
        <ActivityIntroduction narration={activeNarration}>
            <div className="shrink-0"><h2 className="text-lg font-semibold text-info-foreground">{section}</h2><p className="text-sm text-text-secondary">{introductions[subpageIndex]}</p></div>
        </ActivityIntroduction>
        <section aria-label={section} tabIndex={0} className="min-h-0 flex-1 overflow-auto rounded-xl border border-info-border p-4 text-sm leading-relaxed text-foreground">
            {section === "Text & tokens" && <>
                <h3 className="mb-3 text-base font-semibold text-info-foreground">What are we trying to keep?</h3>
                <div className="mb-4 rounded-lg bg-surface-tint p-3">
                    <p><strong>Text:</strong> <code>The cat naps.</code></p>
                    <p><strong>Pattern:</strong> <code>cat</code></p>
                    <p><strong>Token kept:</strong> <code>cat</code></p>
                </div>
                <dl className="grid gap-3 md:grid-cols-2">{terms.map(([term, meaning]) => <div key={term} className="rounded-lg bg-surface-subtle p-3"><dt className="mb-1 font-semibold text-info-foreground">{term}</dt><dd>{meaning}</dd></div>)}</dl>
                <p className="mt-4">Changing the pattern changes which pieces you keep. Next, learn the symbols that let a pattern find more than one exact word.</p>
            </>}
            {section === "Pattern symbols" && <>
                <h3 className="mb-2 text-base font-semibold text-info-foreground">Read a pattern one piece at a time</h3>
                <p className="mb-3">For example, <code>{"[A-Za-z]+(?:['’][A-Za-z]+)*"}</code> keeps English words and contractions whole:</p>
                <ol className="mb-4 list-decimal space-y-1 pl-5">
                    <li><code>[A-Za-z]+</code> takes one or more English letters.</li>
                    <li><code>{"(?:['’][A-Za-z]+)"}</code> groups an apostrophe followed by more letters.</li>
                    <li>The final <code>*</code> allows that group zero or more times, so both <code>stop</code> and <code>don't</code> match.</li>
                </ol>
                <div className="overflow-x-auto"><table className="w-full border-collapse text-left">
                    <caption className="sr-only">Common regex symbols and their meanings</caption>
                    <thead className="bg-surface-tint text-info-foreground"><tr><th scope="col" className="p-2">Term</th><th scope="col" className="p-2">Symbol / example</th><th scope="col" className="p-2">Meaning</th></tr></thead>
                    <tbody>{symbols.map(([term, symbol, meaning]) => <tr key={term} className="border-b border-border"><th scope="row" className="p-2 font-medium">{term}</th><td className="whitespace-nowrap p-2 font-mono">{symbol}</td><td className="p-2">{meaning}</td></tr>)}</tbody>
                </table></div>
                <p className="mt-3">The editor shows the <strong>whole match</strong> as a token, even when the pattern contains capturing groups.</p>
            </>}
            {section === "Flags" && <>
                <h3 className="mb-2 text-base font-semibold text-info-foreground">Change how the same pattern behaves</h3>
                <p className="mb-3">A flag is an optional matching setting. You can combine flags. MULTILINE and DOTALL matter when your text already contains line breaks; they do not insert them.</p>
                <div aria-label="Flag examples" className="mb-4 flex flex-wrap gap-2">{flagExamples.map((item, index) => <Button key={item.name} aria-pressed={flagIndex === index} className={flagIndex === index ? actionClass : optionClass} onClick={() => { setFlagIndex(index); setEnabled(false); }}>{item.name}</Button>)}</div>
                <p className="mb-3"><strong className="text-info-foreground">{flag.name}:</strong> {flag.meaning}</p>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-surface-subtle p-3">
                        <p className="mb-1 font-semibold">Pattern</p><code>{flag.pattern}</code>
                        <p className="mb-1 mt-3 font-semibold">Sample text</p><pre className="whitespace-pre-wrap rounded-md bg-surface p-3">{flag.text}</pre>
                        <p className="mt-2 text-xs">Any line break shown here is an actual newline.</p>
                    </div>
                    <div className="rounded-lg bg-surface-tint p-3">
                        <label className="flex cursor-pointer items-center gap-2 font-semibold"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Enable {flag.name}</label>
                        <div aria-live="polite" className="mt-3">
                            <p className="mb-2">{matches.length} {matches.length === 1 ? "match" : "matches"} with flag {enabled ? "on" : "off"}</p>
                            <div className="flex flex-wrap gap-2">{matches.length ? matches.map((match, index) => <code key={index} className="whitespace-pre-wrap rounded-md border border-info-border bg-surface px-2 py-1">{match}</code>) : <span>No matches.</span>}</div>
                            <p className="mt-3">{enabled ? flag.explanation : "Enable the flag to compare the results."}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 rounded-lg border border-border p-3">
                    <h4 className="mb-1 font-semibold text-info-foreground">How flags appear in Python code</h4>
                    <pre className="overflow-x-auto">{`import re\nre.findall(r"${flag.pattern}", ${JSON.stringify(flag.text)}, flags=re.${flag.name})`}</pre>
                    <p className="mt-2">Inside the pattern, <code>{`(?${flag.inline})${flag.pattern}`}</code> enables the same flag. Combine settings in code with <code>re.IGNORECASE | re.DOTALL</code>, or use <code>(?is)</code> in the pattern.</p>
                </div>
            </>}
        </section>
    </LabFrame>;
}
