import time
import unittest
from fastapi import HTTPException
from pydantic import ValidationError
from api.tokenization import regex_check, regex_preview, porter_state, porter_step, porter_placement
from api.bpe import apply_state, apply_merge, check_tokenizations
from models.text_preprocessing import CustomRegexDataset, CustomPorterDataset, RegexChoiceRequest, PorterStateRequest, PorterStepRequest, PorterPlacementRequest
from models.bpe import CustomBpeDataset, BpeWord, BpeStateRequest, BpeApplyMoveRequest, BpeTokenCheckRequest, BpeTokenAnswer
from services.bpe_service import train
from services.text_preprocessing_service import evaluate_regex, porter_example, porter_stem


class EditorTests(unittest.TestCase):
    def test_custom_regex_text_flags_unicode_and_groups(self):
        dataset = CustomRegexDataset(text="😀 Café café 12.5")
        result = regex_preview(RegexChoiceRequest(dataset=dataset, pattern=r"(café)", flags=["IGNORECASE"]))
        self.assertEqual([item.text for item in result.matches], ["Café", "café"])
        self.assertEqual(result.matches[0].start, 3)  # JavaScript UTF-16 offset
        self.assertEqual(regex_preview(RegexChoiceRequest(dataset=dataset, option_id="numbers")).matches[0].text, "12.5")
        self.assertEqual(len(evaluate_regex(r"^", "a\nb", ["MULTILINE"]).matches), 2)

    def test_goals_test_semantics_and_equivalent_custom_patterns(self):
        dataset = CustomRegexDataset(text="hello")
        self.assertFalse(regex_check(RegexChoiceRequest(dataset=dataset, option_id="word")).correct)
        self.assertTrue(regex_check(RegexChoiceRequest(dataset=dataset, pattern=r"[A-Za-z]+(?:['’][A-Za-z]+)*|[^\w\s]")).correct)
        self.assertTrue(regex_check(RegexChoiceRequest(dataset=CustomRegexDataset(text="-1.5"), option_id="numbers", goal_id="numbers")).correct)

    def test_invalid_and_slow_regex_and_match_limit(self):
        with self.assertRaises(HTTPException):
            regex_preview(RegexChoiceRequest(dataset=CustomRegexDataset(text="a"), pattern="["))
        start = time.monotonic()
        with self.assertRaises(ValueError):
            evaluate_regex(r"(a+)+$", "a" * 1000 + "!")
        self.assertLess(time.monotonic() - start, 6)
        result = evaluate_regex(r".", "a" * 500)
        self.assertEqual(len(result.matches), 200)
        self.assertTrue(result.truncated)

    def test_editable_porter_steps_and_groups(self):
        source = CustomPorterDataset(words=["RUNNING", "runs", "runner", "be", "a"])
        state = porter_state(PorterStateRequest(dataset=source))
        self.assertEqual({item.stem for item in state.groups}, {"run", "runner", "be", "a"})
        for example in state.examples:
            self.assertEqual(example.stem, porter_stem(example.word))
            self.assertEqual(len(example.steps), 6)
            for step in example.steps:
                self.assertTrue(porter_step(PorterStepRequest(dataset=source, word=example.word, step_index=step.index, answer=step.after)).correct)
        self.assertFalse(porter_placement(PorterPlacementRequest(dataset=source, word="runner", stem="run")).correct)
        self.assertTrue(porter_placement(PorterPlacementRequest(dataset=source, word="runs", stem="run")).correct)
        with self.assertRaises(ValidationError):
            CustomPorterDataset(words=["word", "WORD"])
        with self.assertRaises(ValidationError):
            CustomPorterDataset(words=["not-a-word"])

    def test_custom_bpe_application_and_invalid_states(self):
        source = CustomBpeDataset(words=[BpeWord(word="ab", frequency=5), BpeWord(word="ac", frequency=1)], rounds=1, test_words=["ab", "cab"])
        state = train(source)
        self.assertEqual(state.rounds[0].rule.left, "a")
        current = apply_state(BpeStateRequest(dataset=source))
        wrong = apply_merge(BpeApplyMoveRequest(dataset=source, answers=current.answers, rule_index=0, word_index=0, left_index=0, right_index=2))
        self.assertFalse(wrong.correct)
        first = apply_merge(BpeApplyMoveRequest(dataset=source, answers=current.answers, rule_index=0, word_index=0, left_index=0, right_index=1))
        self.assertTrue(first.correct)
        self.assertFalse(first.complete)
        second = apply_merge(BpeApplyMoveRequest(dataset=source, answers=first.answers, rule_index=0, word_index=1, left_index=1, right_index=2))
        self.assertTrue(second.complete)
        self.assertTrue(check_tokenizations(BpeTokenCheckRequest(dataset=source, answers=second.answers)).correct)
        with self.assertRaises(HTTPException):
            apply_merge(BpeApplyMoveRequest(dataset=source, answers=[BpeTokenAnswer(word="ab", tokens=["fake"])], rule_index=0, word_index=0, left_index=0, right_index=1))


if __name__ == "__main__":
    unittest.main()
