# Regex: choose what counts as a token

A regular expression is a pattern for matching text. A tokenizer can collect each match as a token. The pattern `\w+` finds runs of word characters, but it drops punctuation and splits a contraction such as `don't`. The pattern `\S+` keeps every run without spaces, but attaches punctuation to neighboring words.

Look at the same sentence through several patterns. Your goal is to keep `don't` together while giving the comma and exclamation mark their own tokens. Regex rules are explicit and easy to inspect, but a pattern designed for one style of text may need changes for another. [Python regex reference](https://docs.python.org/3/library/re.html)
