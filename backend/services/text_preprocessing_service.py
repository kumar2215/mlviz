import json
import subprocess
import sys

from models.text_preprocessing import (
    CustomPorterDataset, CustomRegexDataset, PorterChange, PorterExample,
    PorterStep, RegexGoal, RegexMatch, RegexOption, RegexPreviewResponse,
)
from utils.porter_stemmer import PorterStemmer


REGEX_TEXT = "Wait, don't stop!"
REGEX_OPTIONS = (
    RegexOption(id="word", label="Word characters", pattern=r"\w+"),
    RegexOption(id="whitespace", label="Non-space runs", pattern=r"\S+"),
    RegexOption(id="letters", label="English letters", pattern=r"[A-Za-z]+"),
    RegexOption(id="unicode_letters", label="Unicode words without decimal digits", pattern=r"[^\W\d_]+"),
    RegexOption(id="contractions", label="Contractions", pattern=r"[A-Za-z]+(?:['’][A-Za-z]+)*"),
    RegexOption(
        id="words_and_punctuation",
        label="Words, contractions, and punctuation",
        pattern=r"[A-Za-z]+(?:['’][A-Za-z]+)*|[^\w\s]",
    ),
    RegexOption(id="numbers", label="Signed decimal numbers", pattern=r"[+-]?\d+(?:\.\d+)?"),
    RegexOption(id="hyphens", label="Hyphenated words", pattern=r"[A-Za-z]+(?:-[A-Za-z]+)*"),
    RegexOption(id="social", label="Hashtags, mentions, words, punctuation", pattern=r"[#@]\w+|\w+|[^\w\s]"),
    RegexOption(id="emails", label="Email-like addresses", pattern=r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    RegexOption(id="sentences", label="Sentence-like runs", pattern=r"[^.!?]+[.!?]?"),
)
REGEX_GOALS = (
    RegexGoal(id="contractions", title="Keep contractions whole and punctuation separate", text=REGEX_TEXT),
    RegexGoal(id="numbers", title="Extract signed decimal numbers as whole tokens", text="Temperature -3.5 C; gain +12.75%; 42 samples."),
    RegexGoal(id="social", title="Keep hashtags and mentions whole; retain words and punctuation", text="Hi @alex, try #NLP today!"),
)
GOAL_PATTERNS = {"contractions": "words_and_punctuation", "numbers": "numbers", "social": "social"}
GOAL_CASES = {
    "contractions": ["I'll go, don't wait!", "They're here; we’ve arrived."],
    "numbers": ["-3.5 +2.75 42", "A: 0.5; B: -12; C: +0.25"],
    "social": ["Hi @alex, #NLP works!", "Ask @jo about #text_2."],
}
PORTER_EXAMPLES = ("caresses", "ponies", "running", "relational", "hopping", "sky")
PORTER_QUIZ_WORDS = ("hopping", "agreed", "plastered")
PORTER_FAMILIES = ("running", "runs", "runner", "hopping", "hopped", "hop")
PORTER_RULE_EXAMPLES = ("hopping", "happy", "relational", "hopeful", "adjustment", "probate")

# Execute user patterns in a disposable process so a slow pattern can be stopped.
_REGEX_SCRIPT = r'''
import json, re, sys
data = json.load(sys.stdin)
try:
    flags = sum(getattr(re, flag) for flag in set(data["flags"]))
    compiled = re.compile(data["pattern"], flags)
    matches = []
    truncated = False
    for index, match in enumerate(compiled.finditer(data["text"])):
        if index == 200:
            truncated = True
            break
        text = data["text"]
        matches.append({"text": match.group(),
                        "start": len(text[:match.start()].encode("utf-16-le")) // 2,
                        "end": len(text[:match.end()].encode("utf-16-le")) // 2})
    print(json.dumps({"matches": matches, "truncated": truncated}))
except re.error as error:
    print(json.dumps({"error": str(error)}))
'''


def resolve_regex_text(dataset):
    return dataset.text if isinstance(dataset, CustomRegexDataset) else REGEX_TEXT


def resolve_porter_words(dataset):
    if isinstance(dataset, CustomPorterDataset):
        return dataset.words
    return list({"rules": PORTER_RULE_EXAMPLES, "families": PORTER_FAMILIES, "suffixes": PORTER_EXAMPLES}[dataset.name])


def resolve_pattern(option_id=None, pattern=None):
    if pattern is not None:
        return pattern
    option = next((item for item in REGEX_OPTIONS if item.id == option_id), None)
    if option is None:
        raise ValueError("Unknown regex pattern")
    return option.pattern


def evaluate_regex(pattern: str, text: str, flags=None) -> RegexPreviewResponse:
    try:
        result = subprocess.run(
            [sys.executable, "-c", _REGEX_SCRIPT],
            input=json.dumps({"pattern": pattern, "text": text, "flags": flags or []}),
            text=True, capture_output=True, timeout=3,
        )
    except subprocess.TimeoutExpired as error:
        raise ValueError("This pattern took too long. Simplify it and try again.") from error
    if result.returncode != 0:
        raise ValueError("Could not evaluate the regex pattern")
    data = json.loads(result.stdout)
    if "error" in data:
        raise ValueError(f"Invalid regex: {data['error']}")
    return RegexPreviewResponse(**data)


def regex_matches(option_id: str) -> list[RegexMatch]:
    return evaluate_regex(resolve_pattern(option_id), REGEX_TEXT).matches


def check_regex_goal(request):
    if request.goal_id not in GOAL_PATTERNS:
        raise ValueError("Unknown regex objective")
    target = resolve_pattern(GOAL_PATTERNS[request.goal_id])
    chosen = resolve_pattern(request.option_id, request.pattern)
    for text in [resolve_regex_text(request.dataset), *GOAL_CASES[request.goal_id]]:
        expected = evaluate_regex(target, text)
        actual = evaluate_regex(chosen, text, request.flags)
        if expected.truncated or actual.truncated:
            raise ValueError("Use a shorter example for objective checks (up to 200 matches)")
        if expected.matches != actual.matches:
            return False
    return True


def porter_stem(word: str) -> str:
    normalized = word.lower()
    return PorterStemmer().stem(normalized, 0, len(normalized) - 1)


def porter_example(word: str) -> PorterExample:
    stemmer = PorterStemmer()
    stemmer.b = word.lower()
    stemmer.k = len(stemmer.b) - 1
    stemmer.k0 = 0
    changes: list[PorterChange] = []
    steps: list[PorterStep] = []
    previous = stemmer.b
    for index, (label, method) in enumerate((
        ("1a–1b: plurals and verb endings", stemmer.step1ab),
        ("1c: final y", stemmer.step1c),
        ("2: replace longer suffixes", stemmer.step2),
        ("3: shorten suffixes", stemmer.step3),
        ("4: remove remaining endings", stemmer.step4),
        ("5: final e and double l", stemmer.step5),
    )):
        if len(word) > 2:
            method()
        current = stemmer.b[:stemmer.k + 1]
        suffix = next((ending for ending in ("sses", "ies", "ing", "ed", "ational", "tional", "izer", "ness", "ment", "s", "e") if previous.endswith(ending)), "")
        naive = previous[:-len(suffix)] if suffix else previous[:-1]
        candidates = list(dict.fromkeys([current, previous, naive or previous, current + "e"]))[:3]
        steps.append(PorterStep(index=index, label=label, before=previous, after=current, candidates=sorted(candidates)))
        if current != previous:
            changes.append(PorterChange(step=label, word=current))
        previous = current
    return PorterExample(word=word, stem=previous, changes=changes, steps=steps)
