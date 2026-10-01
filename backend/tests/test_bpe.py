import unittest

from pydantic import ValidationError

from api.bpe import check_counts, check_merge, check_restore, check_tokenizations
from models.bpe import (
    BpeCorpus, BpeCountAnswer, BpeCountCheckRequest, BpeMergeCheckRequest,
    BpePair, BpeRestoreCheckRequest, BpeTokenAnswer, BpeTokenCheckRequest,
    BpeWord, PredefinedBpeDataset,
)
from services.bpe_service import count_pairs, initial_tokens, merge_tokens, resolve_corpus, tokenize, train


class BpeTests(unittest.TestCase):
    def test_predefined_walkthrough_and_restoration(self):
        source = PredefinedBpeDataset(name="walkthrough")
        state = train(source)
        self.assertEqual([(step.rule.left, step.rule.right) for step in state.rounds], [("l", "o"), ("lo", "w")])
        self.assertEqual(state.rounds[0].counts[0].count, 15)
        self.assertEqual(tokenize("lowest", state.rounds), ["low", "e", "s", "t", "</w>"])
        self.assertEqual(initial_tokens("low")[-1], "</w>")
        self.assertNotIn("w</w>", tokenize("low", state.rounds))

        wrong = check_restore(BpeRestoreCheckRequest(dataset=source, round_index=0, selected_index=1, right_index=2))
        self.assertFalse(wrong.correct)
        first = check_restore(BpeRestoreCheckRequest(dataset=source, round_index=0, selected_index=0, right_index=1))
        self.assertTrue(first.correct)
        self.assertEqual(first.tokens[:2], ["lo", "w"])
        second = check_restore(BpeRestoreCheckRequest(dataset=source, round_index=1, selected_index=0, right_index=1))
        self.assertEqual(second.tokens, ["low", "e", "s", "t", "</w>"])

    def test_practice_answers_are_checked_on_backend(self):
        source = PredefinedBpeDataset(name="practice")
        state = train(source)
        self.assertEqual([(step.rule.left, step.rule.right) for step in state.rounds], [("l", "o"), ("lo", "w")])
        answers = [BpeCountAnswer(left=pair.left, right=pair.right, count=next(count.count for count in state.rounds[0].counts if count.left == pair.left and count.right == pair.right)) for pair in state.rounds[0].questions]
        self.assertTrue(check_counts(BpeCountCheckRequest(dataset=source, round_index=0, answers=answers)).correct)
        self.assertFalse(check_counts(BpeCountCheckRequest(dataset=source, round_index=0, answers=answers[:1])).correct)
        answers[0].count -= 1
        self.assertFalse(check_counts(BpeCountCheckRequest(dataset=source, round_index=0, answers=answers)).correct)
        self.assertFalse(check_merge(BpeMergeCheckRequest(dataset=source, round_index=0, pair=BpePair(left="o", right="w"))).correct)
        self.assertTrue(check_merge(BpeMergeCheckRequest(dataset=source, round_index=0, pair=BpePair(left="l", right="o"))).correct)
        answers = [BpeTokenAnswer(word=word, tokens=tokenize(word, state.rounds)) for word in state.test_words]
        self.assertTrue(check_tokenizations(BpeTokenCheckRequest(dataset=source, answers=answers)).correct)
        answers[0].tokens = ["wrong"]
        self.assertFalse(check_tokenizations(BpeTokenCheckRequest(dataset=source, answers=answers)).correct)

    def test_source_independent_corpus_and_tie_order(self):
        corpus = BpeCorpus(words=[BpeWord(word="ab", frequency=2), BpeWord(word="ac", frequency=2)], rounds=1)
        self.assertIs(resolve_corpus(corpus), corpus)
        state = train(corpus)
        self.assertEqual(state.rounds[0].rule, BpePair(left="a", right="b"))
        self.assertEqual(state.rounds[0].counts[0].count, 2)
        self.assertEqual(merge_tokens(["a", "b", "a", "b", "</w>"], BpePair(left="a", right="b")), ["ab", "ab", "</w>"])
        self.assertEqual(count_pairs(state.initial)[0].left, "a")

    def test_invalid_dataset(self):
        with self.assertRaises(ValidationError):
            BpeCorpus(words=[BpeWord(word="bad word", frequency=1)])
        with self.assertRaises(ValidationError):
            BpeWord(word="bad", frequency=0)


if __name__ == "__main__":
    unittest.main()
