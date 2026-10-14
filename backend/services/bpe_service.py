from collections import Counter

from models.bpe import (
    BpeCorpus, BpePair, BpePairCount, BpeRound, BpeStateResponse,
    BpeTokenWord, BpeWord, PredefinedBpeDataset,
    BpeApplyStateResponse, BpeTokenAnswer,
)

END = "</w>"

PREDEFINED_CORPORA = {
    "walkthrough": BpeCorpus(
        words=[
            BpeWord(word="low", frequency=8),
            BpeWord(word="lower", frequency=4),
            BpeWord(word="lowest", frequency=3),
            BpeWord(word="newest", frequency=1),
            BpeWord(word="widest", frequency=1),
        ],
        rounds=2,
        test_words=["lower"],
        restore_word="lowest",
    ),
    "practice": BpeCorpus(
        words=[
            BpeWord(word="low", frequency=4),
            BpeWord(word="lower", frequency=3),
            BpeWord(word="lowest", frequency=2),
            BpeWord(word="long", frequency=5),
            BpeWord(word="lonely", frequency=1),
        ],
        rounds=2,
        test_words=["lower", "long", "lowest"],
    ),
}


def resolve_corpus(source: PredefinedBpeDataset | BpeCorpus) -> BpeCorpus:
    """Normalize a corpus source; future source variants belong here."""
    if isinstance(source, BpeCorpus):
        return source
    return PREDEFINED_CORPORA[source.name]


def initial_tokens(word: str) -> list[str]:
    return [*word, END]


def count_pairs(corpus: list[BpeTokenWord]) -> list[BpePairCount]:
    counts: Counter[tuple[str, str]] = Counter()
    for row in corpus:
        for left, right in zip(row.tokens, row.tokens[1:]):
            counts[(left, right)] += row.frequency
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [BpePairCount(left=left, right=right, count=count) for (left, right), count in ordered]


def merge_tokens(tokens: list[str], pair: BpePair) -> list[str]:
    merged: list[str] = []
    index = 0
    while index < len(tokens):
        if index + 1 < len(tokens) and tokens[index] == pair.left and tokens[index + 1] == pair.right:
            merged.append(pair.left + pair.right)
            index += 2
        else:
            merged.append(tokens[index])
            index += 1
    return merged


def train(source: PredefinedBpeDataset | BpeCorpus) -> BpeStateResponse:
    dataset = resolve_corpus(source)
    corpus = [BpeTokenWord(word=row.word, tokens=initial_tokens(row.word), frequency=row.frequency) for row in dataset.words]
    initial = corpus
    rounds: list[BpeRound] = []
    for _ in range(dataset.rounds):
        counts = count_pairs(corpus)
        if not counts:
            break
        rule = BpePair(left=counts[0].left, right=counts[0].right)
        after = [BpeTokenWord(word=row.word, tokens=merge_tokens(row.tokens, rule), frequency=row.frequency) for row in corpus]
        questions = sorted(
            [BpePair(left=pair.left, right=pair.right) for pair in counts[:4]],
            key=lambda pair: (pair.left, pair.right),
        )
        rounds.append(BpeRound(before=corpus, counts=counts, questions=questions, rule=rule, after=after))
        corpus = after
    return BpeStateResponse(
        initial=initial,
        rounds=rounds,
        test_words=dataset.test_words,
        restore_word=dataset.restore_word,
        restore_initial=initial_tokens(dataset.restore_word) if dataset.restore_word else None,
    )


def tokenize(word: str, rounds: list[BpeRound]) -> list[str]:
    tokens = initial_tokens(word)
    for round_data in rounds:
        tokens = merge_tokens(tokens, round_data.rule)
    return tokens


def advance_rule(answers: list[BpeTokenAnswer], rounds: list[BpeRound], index: int) -> BpeApplyStateResponse:
    while index < len(rounds):
        rule = rounds[index].rule
        if any(merge_tokens(answer.tokens, rule) != answer.tokens for answer in answers):
            break
        index += 1
    return BpeApplyStateResponse(answers=answers, rule_index=index, complete=index == len(rounds))


def initial_application(source) -> BpeApplyStateResponse:
    state = train(source)
    if not state.test_words:
        raise ValueError("Enter at least one test word")
    return advance_rule([BpeTokenAnswer(word=word, tokens=initial_tokens(word)) for word in state.test_words], state.rounds, 0)


def apply_selected(request):
    state = train(request.dataset)
    if request.rule_index >= len(state.rounds) or request.word_index >= len(request.answers):
        raise ValueError("Selected rule or word is out of range")
    if [answer.word for answer in request.answers] != state.test_words:
        raise ValueError("Answers must contain the current test words in order")
    rule = state.rounds[request.rule_index].rule
    for answer in request.answers:
        before = tokenize(answer.word, state.rounds[:request.rule_index])
        after = merge_tokens(before, rule)
        if answer.tokens not in (before, after):
            raise ValueError("Token state does not match the learned rules")
    answer = request.answers[request.word_index]
    left = request.left_index
    correct = (
        request.right_index == left + 1
        and left + 1 < len(answer.tokens)
        and answer.tokens[left] == rule.left and answer.tokens[left + 1] == rule.right
    )
    answers = [item.model_copy(deep=True) for item in request.answers]
    if correct:
        answers[request.word_index].tokens = merge_tokens(answer.tokens, rule)
    return correct, advance_rule(answers, state.rounds, request.rule_index)
