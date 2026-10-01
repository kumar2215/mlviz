# How should we split a sentence?

Before a model can work with text, it needs useful pieces. In this story, first use a **regular expression** to find tokens, then apply **Porter stemming** to normalize words, and finally learn how **byte-pair encoding (BPE)** builds reusable subword tokens. Each method solves a different part of the problem.
