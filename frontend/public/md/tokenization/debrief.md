# Three ways to handle text

**Regex** identifies tokens by a written pattern. **Porter stemming** reduces English word forms after they have been separated. **BPE** learns frequent subword merges from a corpus, then reuses those pieces on new words.

Try the standalone visualisations again with their own controls. When designing a text pipeline, decide what boundaries to preserve and whether you need whole words, normalized word forms, or learned subwords.
