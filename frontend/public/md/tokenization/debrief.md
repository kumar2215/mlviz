# Three tools, three choices

**Regex** encodes the boundaries you choose. Its success depends on the pattern and the kind of text.

**Porter stemming** groups English word forms using ordered suffix rules. Its output can be a non-word, and related words do not always share a stem.

**BPE** learns frequent adjacent pieces from a weighted corpus. Changing the words or their frequencies can change the rules it learns. Unfamiliar words can still be represented with smaller pieces.

Choose the boundaries and normalization your task needs, then test representative examples rather than assuming one method suits every input.
