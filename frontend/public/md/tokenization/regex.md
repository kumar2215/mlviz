# Which pattern fits which text?

A pattern should preserve the boundaries your text needs.

| Preset | Best for |
| --- | --- |
| Word characters (`\w+`) | Letters, numbers, and underscores; splits at apostrophes and punctuation. |
| Non-space runs (`\S+`) | Pieces separated by whitespace; keeps attached punctuation. |
| Words, contractions, and punctuation | Keeps contractions whole and punctuation as separate tokens. |
| Signed decimal numbers | Keeps signs and decimal points with the number. |
| Hashtags, mentions, words, punctuation | Keeps hashtags and mentions whole, with other punctuation separate. |

Test representative examples. Next, explore how stemming changes a word.
