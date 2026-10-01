import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from api.tokenization import porter_check, porter_state, regex_check, regex_preview, regex_state
from models.tokenization import (
    PorterAnswer, PorterCheckRequest, PorterStateRequest, PredefinedPorterDataset,
    PredefinedRegexDataset, RegexChoiceRequest, RegexStateRequest,
)
from services.tokenization_service import porter_example, porter_stem


class TokenizationTests(unittest.TestCase):
    def test_regex_patterns_and_answer_gate(self):
        dataset = PredefinedRegexDataset(name="punctuation")
        state = regex_state(RegexStateRequest(dataset=dataset))
        self.assertEqual(state.text, "Wait, don't stop!")
        expected = ["Wait", ",", "don't", "stop", "!"]
        correct_choice = RegexChoiceRequest(dataset=dataset, option_id="words_and_punctuation")
        self.assertEqual([match.text for match in regex_preview(correct_choice).matches], expected)
        self.assertEqual([(match.start, match.end) for match in regex_preview(correct_choice).matches],
                         [(0, 4), (4, 5), (6, 11), (12, 16), (16, 17)])
        self.assertTrue(regex_check(correct_choice).correct)
        self.assertFalse(regex_check(RegexChoiceRequest(dataset=dataset, option_id="word")).correct)
        self.assertFalse(regex_check(RegexChoiceRequest(dataset=dataset, option_id="whitespace")).correct)
        with self.assertRaises(HTTPException):
            regex_preview(RegexChoiceRequest(dataset=dataset, option_id="unknown"))

    def test_porter_reference_outputs_and_answer_gate(self):
        expected = {
            "caresses": "caress", "ponies": "poni", "running": "run",
            "hopping": "hop", "agreed": "agre", "plastered": "plaster",
        }
        for word, stem in expected.items():
            self.assertEqual(porter_stem(word), stem)
            self.assertEqual(porter_example(word).stem, stem)
        dataset = PredefinedPorterDataset(name="suffixes")
        state = porter_state(PorterStateRequest(dataset=dataset))
        self.assertEqual(state.quiz_words, ["hopping", "agreed", "plastered"])
        answers = [PorterAnswer(word=word, stem=expected[word]) for word in state.quiz_words]
        self.assertTrue(porter_check(PorterCheckRequest(dataset=dataset, answers=answers)).correct)
        answers[0].stem = "hopp"
        self.assertFalse(porter_check(PorterCheckRequest(dataset=dataset, answers=answers)).correct)
        self.assertFalse(porter_check(PorterCheckRequest(dataset=dataset, answers=answers[:2])).correct)

    def test_invalid_datasets(self):
        with self.assertRaises(ValidationError):
            PredefinedRegexDataset(name="unknown")
        with self.assertRaises(ValidationError):
            PredefinedPorterDataset(name="unknown")


if __name__ == "__main__":
    unittest.main()
