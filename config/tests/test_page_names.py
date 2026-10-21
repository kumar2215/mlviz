"""Readable page names must survive config-builder import and export."""

import unittest

from models import DynamicPage, StaticPage


class PageNameTests(unittest.TestCase):
    def test_names_round_trip_without_a_separate_display_field(self):
        for page in [
            DynamicPage(name="Follow Questions"),
            StaticPage(page_type="static", name="What is a decision tree?"),
        ]:
            with self.subTest(page_type=page.page_type):
                exported = page.model_dump()
                self.assertEqual(exported["name"], page.name)
                self.assertNotIn("display_name", exported)
                self.assertEqual(type(page).model_validate_json(page.model_dump_json()), page)


if __name__ == "__main__":
    unittest.main()
