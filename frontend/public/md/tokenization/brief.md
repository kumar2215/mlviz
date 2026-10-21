# Preparing text for a model

Text processing prepares raw text for a model. **Tokenization** divides text into pieces called tokens, such as words, punctuation, or parts of words. **Stemming** reduces word forms to a shared stem.

- **Regular expressions (regex)** use character patterns to select tokens from text.
- **Porter stemming** applies ordered suffix rules to English words, such as `running → run`. A stem need not be a dictionary word.
- **Byte pair encoding (BPE)** learns frequent adjacent pieces from a corpus and merges them into subword tokens.

Explore how your choice of patterns, words, and corpus frequencies changes the results.
