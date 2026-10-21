# Why BPE uses subwords

A word-level tokenizer needs a separate entry for *low*, *lower*, and *lowest*. BPE starts with characters and repeatedly joins frequent adjacent pairs, allowing these words to share a token such as `low`.

The `</w>` marker marks the end of each word. Merges stay within that boundary, and unfamiliar words can still be represented as smaller pieces.
