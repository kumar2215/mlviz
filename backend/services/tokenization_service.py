import re

from models.tokenization import PorterChange, PorterExample, RegexMatch, RegexOption
from utils.porter_stemmer import PorterStemmer


REGEX_TEXT = "Wait, don't stop!"
REGEX_OPTIONS = (
    RegexOption(id="word", label="Word characters", pattern=r"\w+"),
    RegexOption(id="whitespace", label="Non-space runs", pattern=r"\S+"),
    RegexOption(
        id="words_and_punctuation",
        label="Words, contractions, and punctuation",
        pattern=r"[A-Za-z]+(?:'[A-Za-z]+)?|[^\w\s]",
    ),
)
PORTER_EXAMPLES = ("caresses", "ponies", "running")
PORTER_QUIZ_WORDS = ("hopping", "agreed", "plastered")


def regex_matches(option_id: str) -> list[RegexMatch]:
    option = next((item for item in REGEX_OPTIONS if item.id == option_id), None)
    if option is None:
        raise ValueError("Unknown regex pattern")
    return [RegexMatch(text=match.group(), start=match.start(), end=match.end())
            for match in re.finditer(option.pattern, REGEX_TEXT)]


def porter_stem(word: str) -> str:
    normalized = word.lower()
    return PorterStemmer().stem(normalized, 0, len(normalized) - 1)


def porter_example(word: str) -> PorterExample:
    stemmer = PorterStemmer()
    stemmer.b = word.lower()
    stemmer.k = len(stemmer.b) - 1
    stemmer.k0 = 0
    changes: list[PorterChange] = []
    previous = stemmer.b
    for label, method in (
        ("1a-1b: plurals and -ed/-ing", stemmer.step1ab),
        ("1c: final y", stemmer.step1c),
        ("2: double suffixes", stemmer.step2),
        ("3: other suffixes", stemmer.step3),
        ("4: remove suffix", stemmer.step4),
        ("5: final e or ll", stemmer.step5),
    ):
        method()
        current = stemmer.b[:stemmer.k + 1]
        if current != previous:
            changes.append(PorterChange(step=label, word=current))
        previous = current
    return PorterExample(word=word, stem=previous, changes=changes)
