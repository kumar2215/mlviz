import { useEffect, useState } from "react";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import { Button } from "@/components/ui/button";
import type { IndexPageProps } from "@/types/page";
import { actionClass, LabFrame, optionClass } from "../../shared/LabFrame";
import BpeCorpusView from "./BpeCorpusView";

const topics = ["BPE & terms", "A merge example", "Training & tokenizing"] as const;
const introductions = [
    "Learn how frequent neighboring pieces become reusable tokens.",
    "Follow two merges to see how pair counts and tokens change.",
    "Compare learning merge rules with applying those rules to new text.",
] as const;

const terms = [
    ["BPE", "Short for Byte Pair Encoding. It learns reusable pieces of text by joining neighboring pieces that appear often."],
    ["Token", "One piece of text, such as l, lo, or low. It can be a single character, part of a word, or a whole word."],
    ["Merge", "Joining two neighboring tokens into one: l + o becomes lo."],
] as const;

const walkthrough = [
    {
        title: "Start with characters",
        explanation: "Split each word into characters. Add </w> to mark the word's end; it is not a letter and can also be merged. Merges stay within each word.",
        counts: [["l", "o", 6], ["o", "w", 6], ["w", "</w>", 4], ["e", "r", 2], ["r", "</w>", 2], ["w", "e", 2]],
        hint: "l + o and o + w both count 4 + 2 = 6. This lab breaks ties alphabetically, so l + o is selected first.",
        corpus: [
            { word: "low", frequency: 4, tokens: ["l", "o", "w", "</w>"] },
            { word: "lower", frequency: 2, tokens: ["l", "o", "w", "e", "r", "</w>"] },
        ],
    },
    {
        title: "Merge 1: l + o → lo",
        explanation: "Join l + o in both words, then recount using the new tokens. The pair lo + w now has the highest count: 6.",
        counts: [["lo", "w", 6], ["w", "</w>", 4], ["e", "r", 2], ["r", "</w>", 2], ["w", "e", 2]],
        hint: "Counts depend on the current tokens. After this merge, l and o are no longer separate tokens in these rows.",
        corpus: [
            { word: "low", frequency: 4, tokens: ["lo", "w", "</w>"] },
            { word: "lower", frequency: 2, tokens: ["lo", "w", "e", "r", "</w>"] },
        ],
    },
    {
        title: "Merge 2: lo + w → low",
        explanation: "Join lo + w in both words. With a budget of two merges, training stops here and saves the two rules in order.",
        counts: [["low", "</w>", 4], ["e", "r", 2], ["low", "e", 2], ["r", "</w>", 2]],
        hint: "low is now a whole-word token in low and a subword token in lower. BPE chose it because it was frequent, without needing to know its meaning.",
        corpus: [
            { word: "low", frequency: 4, tokens: ["low", "</w>"] },
            { word: "lower", frequency: 2, tokens: ["low", "e", "r", "</w>"] },
        ],
    },
];

type Props = Pick<IndexPageProps, "narration" | "subpageIndex" | "onSubpageReady" | "onComplete">;

export default function BpeIntroduction({ narration, subpageIndex = 0, onSubpageReady, onComplete }: Props) {
    const topic = topics[subpageIndex];
    const activeNarration = subpageIndex === 0 ? narration : undefined;
    const [step, setStep] = useState(0);
    const example = walkthrough[step];

    useEffect(() => {
        if (!topic || activeNarration?.loading) return;
        onSubpageReady?.();
        if (subpageIndex === topics.length - 1) onComplete();
    }, [topic, subpageIndex, activeNarration?.loading, onSubpageReady, onComplete]);

    return <LabFrame>
        <ActivityIntroduction narration={activeNarration}>
            <div className="shrink-0"><h2 className="text-lg font-semibold text-info-foreground">{topic}</h2><p className="text-sm text-text-secondary">{introductions[subpageIndex]}</p></div>
        </ActivityIntroduction>
        <section aria-label={topic} tabIndex={0} className="min-h-0 flex-1 overflow-auto rounded-xl border border-info-border p-4 text-sm leading-relaxed text-foreground">
            {topic === "BPE & terms" && <>
                <h3 className="mb-2 text-base font-semibold text-info-foreground">Why learn pieces of words?</h3>
                <p className="mb-4 rounded-lg bg-surface-tint p-3">Words such as <code>low</code> and <code>lower</code> share the piece <code>low</code>. BPE learns pieces like this so they can be reused across different words.</p>
                <dl className="grid gap-3 md:grid-cols-2">{terms.map(([term, meaning]) => <div key={term} className="rounded-lg bg-surface-subtle p-3"><dt className="mb-1 font-semibold text-info-foreground">{term}</dt><dd>{meaning}</dd></div>)}</dl>
            </>}
            {topic === "A merge example" && <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-info-foreground">Two words, two learned merges</h3><span className="text-selection-foreground">{step} of 2 merges applied</span></div>
                <p className="mb-3">The <strong>corpus</strong> is the text we learn from. Here, <code>low</code> appears four times and <code>lower</code> twice. These are their <strong>frequencies</strong>.</p>
                <div aria-live="polite">
                    <div className="mb-4 rounded-lg bg-surface-tint p-3"><h4 className="mb-1 font-semibold text-info-foreground">{example.title}</h4><p>{example.explanation}</p></div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div><h4 className="mb-2 font-semibold text-info-foreground">Current tokens</h4><BpeCorpusView corpus={example.corpus} /><p className="mt-2 text-xs">The number at the right is the word frequency.</p></div>
                        <div><h4 className="mb-2 font-semibold text-info-foreground">Weighted pair counts</h4><div className="grid grid-cols-2 gap-2">{example.counts.map(([left, right, count], index) => <div key={`${left}-${right}`} className={`flex items-center justify-between gap-2 rounded-lg border p-2 font-mono ${index === 0 && step < 2 ? "border-primary bg-surface-tint text-info-foreground" : "border-border bg-surface-subtle"}`}><span>{left} + {right}</span><strong>{count}</strong></div>)}</div></div>
                    </div>
                    <p className="mt-4 rounded-lg border border-info-border p-3">{example.hint}</p>
                    <div className="mt-3 rounded-lg bg-surface-subtle p-3"><h4 className="mb-1 font-semibold text-info-foreground">Learned rules, in order</h4>{step === 0 ? <p>No rules yet.</p> : <ol className="list-decimal pl-5"><li><code>l + o → lo</code></li>{step === 2 && <li><code>lo + w → low</code></li>}</ol>}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><Button className={optionClass} disabled={step === 0} onClick={() => setStep(current => current - 1)}>Previous step</Button><Button className={actionClass} disabled={step === 2} onClick={() => setStep(current => current + 1)}>Next merge</Button><Button className={optionClass} disabled={step === 0} onClick={() => setStep(0)}>Start again</Button></div>
            </>}
            {topic === "Training & tokenizing" && <>
                <h3 className="mb-3 text-base font-semibold text-info-foreground">Learn rules first, then reuse them</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <section className="rounded-lg bg-surface-tint p-4"><h4 className="mb-2 font-semibold text-info-foreground">1. Training: the BPE Lab</h4><ol className="list-decimal space-y-2 pl-5"><li>Enter a corpus, one word and its frequency per line.</li><li>Count adjacent pairs, weighted by word frequency.</li><li>Choose the most frequent pair. For ties, choose the alphabetically first pair.</li><li>Merge that pair throughout the corpus and recount. Repeat until the merge budget (the number of rounds to try) is reached or no pairs remain.</li></ol><p className="mt-3 font-semibold">Result: an ordered list of merge rules.</p></section>
                    <section className="rounded-lg bg-surface-subtle p-4"><h4 className="mb-2 font-semibold text-info-foreground">2. Tokenizing: BPE Apply</h4><ol className="list-decimal space-y-2 pl-5"><li>Start a test word with separate characters and the word-end marker.</li><li>Apply the learned rules in their original order.</li><li>Skip a rule if its pair is not present. You do not pick a new pair by frequency.</li><li>After all applicable rules, the remaining pieces are the word's tokens.</li></ol><p className="mt-3 font-semibold">Result: tokens produced by the existing rules.</p></section>
                </div>
                <div className="mt-4 rounded-lg border border-info-border p-3"><h4 className="mb-2 font-semibold text-info-foreground">Reuse the example's rules on a new word</h4><p><code>lowest</code> starts as <code>{"l | o | w | e | s | t | </w>"}</code>.</p><p className="mt-1">Rule 1 gives <code>{"lo | w | e | s | t | </w>"}</code>; rule 2 gives <code>{"low | e | s | t | </w>"}</code>.</p><p className="mt-2">The word was absent from the example corpus, but the learned piece <code>low</code> is still reusable. Changing the training corpus or its frequencies can produce different rules.</p></div>
            </>}
        </section>
        {subpageIndex === topics.length - 1 && <p className="shrink-0 text-sm text-text-secondary">Next: train your own merge rules in the BPE Lab.</p>}
    </LabFrame>;
}
