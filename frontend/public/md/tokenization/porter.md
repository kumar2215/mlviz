# Porter’s suffix rules

Porter applies these groups **in order**. Examples below show the result of that group, before later rules run.

- **1a–1b, plurals/verbs:** `sses → ss`, `ies → i`; drop `s` except in `ss`. For `eed`, use `eed → ee` only if `m > 0`. Other `ed`/`ing` endings are removed if the remainder has a vowel; then adjust doubled consonants or restore `e`: `hopping → hop`.
- **1c, final y:** `y → i` if the remainder has a vowel: `happy → happi`; keep `sky`.
- **2, longer suffixes:** for `m > 0`, e.g. `ational → ate`, `izer → ize`: `relational → relate`.
- **3, shorter suffixes:** for `m > 0`, e.g. `icate → ic`, remove `ful`/`ness`: `hopeful → hope`.
- **4, remaining endings:** for `m > 1`, remove endings such as `ment`, `ance`, or `al`: `adjustment → adjust`. Remove `ion` only after `s` or `t`.
- **5, final e/ll:** remove `e` for `m > 1`, or `m = 1` without a short CVC ending; reduce `ll → l` for `m > 1`: `probate → probat`, but keep `rate`.

**m** counts vowel-to-consonant transitions in the remaining stem. **CVC** means consonant–vowel–consonant, excluding final `w`, `x`, or `y`. These conditions prevent indiscriminate suffix removal.
