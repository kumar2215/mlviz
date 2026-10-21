"""Completion conditions must survive the config builder's import/export path."""

import json
from pathlib import Path
import unittest
from unittest.mock import patch

from pydantic import TypeAdapter

from models import CompletedCheck
from models.conditions import Condition
from models.story import Edge
from utils.form_helpers import render_condition_config


class CompletionConfigTests(unittest.TestCase):
    def test_completed_condition_round_trips_through_an_edge(self):
        condition = {"condition_type": "Completed", "name": "Keep learning"}
        edge = Edge.model_validate({
            "start": {"local_index": 1},
            "end": {"local_index": 2},
            "condition": condition,
        })
        self.assertIsInstance(edge.condition, CompletedCheck)
        exported = json.loads(edge.model_dump_json(exclude_none=True))
        self.assertEqual(exported["condition"], condition)
        self.assertEqual(Edge.model_validate(exported), edge)

    def test_compound_conditions_and_completion_action_counts(self):
        adapter = TypeAdapter(Condition)
        condition = adapter.validate_python({
            "condition_type": "And",
            "conditions": [
                {"condition_type": "Completed"},
                {"condition_type": "Or", "conditions": [
                    {"condition_type": "ActionCount", "action": "page_complete", "min": 2},
                    {"condition_type": "Button", "button_id": "continue"},
                ]},
            ],
        })
        self.assertEqual(adapter.validate_json(adapter.dump_json(condition)), condition)

    def test_builder_exports_completed_without_an_id(self):
        with patch("utils.form_helpers.st") as streamlit:
            streamlit.session_state = {}
            condition = render_condition_config("Completed", {"name": "Next", "description": "Finish the exercise"}, 0, "test_completion", show_details=True)
            streamlit.caption.assert_called_once()
        self.assertEqual(condition, {
            "condition_type": "Completed", "name": "Next", "description": "Finish the exercise",
        })
        self.assertIsInstance(TypeAdapter(Condition).validate_python(condition), CompletedCheck)

    def test_builder_offers_completion_in_action_count_selector(self):
        with patch("utils.form_helpers.st") as streamlit:
            streamlit.session_state = {}
            streamlit.columns.return_value = (streamlit, streamlit)
            condition = render_condition_config("ActionCount", {"action": "page_complete", "min": 2}, 0, "test_count", show_details=True)
            self.assertIn("page_complete", streamlit.selectbox.call_args.kwargs["options"])
        self.assertEqual(condition, {"condition_type": "ActionCount", "action": "page_complete", "min": 2})

    def test_bundled_transition_conditions_validate(self):
        root = Path(__file__).resolve().parents[2] / "frontend" / "public" / "config"
        adapter = TypeAdapter(Condition)
        for path in root.rglob("*.json"):
            data = json.loads(path.read_text(encoding="utf-8"))
            for transition in data.get("transitions", []):
                with self.subTest(path=path, source=transition["from"]):
                    condition = adapter.validate_python(transition["condition"])
                    self.assertEqual(adapter.validate_json(adapter.dump_json(condition)), condition)


if __name__ == "__main__":
    unittest.main()
