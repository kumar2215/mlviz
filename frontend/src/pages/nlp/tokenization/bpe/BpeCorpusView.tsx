import type { BpeState } from "@/api/bpe";

type Corpus = BpeState["initial"];

export default function BpeCorpusView({ corpus }: { corpus: Corpus }) {
    return (
        <div className="grid gap-1.5" aria-label="Weighted corpus">
            {corpus.map(row => (
                <div key={row.word} className="flex items-center gap-2 rounded-lg bg-surface-subtle px-2 py-1">
                    <span className="min-w-16 font-mono text-xs font-semibold text-text-secondary">{row.word}</span>
                    <div className="flex flex-1 flex-wrap gap-1">
                        {row.tokens.map((token, index) => <span key={`${index}-${token}`} className="rounded bg-selection px-1.5 py-0.5 font-mono text-xs text-info-foreground">{token}</span>)}
                    </div>
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 font-mono text-xs">× {row.frequency}</span>
                </div>
            ))}
        </div>
    );
}
