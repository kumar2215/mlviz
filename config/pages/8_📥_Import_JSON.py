"""Import JSON Page - Import configuration from JSON text"""
import streamlit as st
import json
import sys
from pathlib import Path

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Config, compute_object_hash

st.set_page_config(page_title="Import JSON", page_icon="📥")

st.header("Import Config from JSON")

# Initialize session state if not exists
if 'config' not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

# Show success message persisted across rerun
if st.session_state.pop("import_success", None):
    st.success("Config imported successfully!")

st.markdown("Paste your JSON config below:")

json_text = st.text_area(
    "JSON Config",
    height=400,
    placeholder='''{
  "stories": {
    "intro": {
      "name": "intro",
      "description": "Introduction story",
      "start_page": 0,
      "nodes": [{"index": 0}],
      "edges": []
    }
  },
  "pages": {
    "0": {
      "page_type": "static",
      "parameters": {
        "text": "Welcome!",
        "link": null
      }
    }
  }
}'''
)

rehash = st.checkbox(
    "Recompute page hashes on import",
    value=True,
    help="Recompute page IDs from content and update story node references accordingly.",
)


def rehash_config(config_dict: dict) -> dict:
    """Recompute page hashes and update story node references."""
    old_pages = config_dict.get("pages", {})
    id_map = {}  # old_id -> new_id
    new_pages = {}

    for old_id, page_data in old_pages.items():
        # Rebuild the validated page to compute its hash
        from models.config import PageUnion
        from pydantic import TypeAdapter
        adapter = TypeAdapter(PageUnion)
        page_instance = adapter.validate_python(page_data)
        new_id = compute_object_hash(page_instance)
        id_map[str(old_id)] = str(new_id)
        new_pages[str(new_id)] = page_data

    config_dict["pages"] = new_pages

    # Update story node references
    for story in config_dict.get("stories", {}).values():
        for node in story.get("nodes", []):
            old_index = str(node.get("index", ""))
            if old_index in id_map:
                node["index"] = id_map[old_index]

    return config_dict, id_map


col1, col2 = st.columns(2)

with col1:
    if st.button("📥 Import Config", type="primary"):
        if not json_text.strip():
            st.error("Please paste JSON config")
        else:
            try:
                config_data = json.loads(json_text)
                config = Config.model_validate(config_data)
                result = config.model_dump()
                if rehash:
                    result, id_map = rehash_config(result)
                    changed = {k: v for k, v in id_map.items() if k != v}
                    if changed:
                        st.info(f"Rehashed {len(changed)} page ID(s)")
                st.session_state.config = result
                st.session_state.import_success = True
                st.rerun()
            except json.JSONDecodeError as e:
                st.error(f"Invalid JSON: {str(e)}")
            except Exception as e:
                st.error(f"Error validating config: {str(e)}")

with col2:
    if st.button("🔍 Validate Only", type="secondary"):
        if not json_text.strip():
            st.warning("Please paste JSON config")
        else:
            try:
                config_data = json.loads(json_text)
                config = Config.model_validate(config_data)
                result = config.model_dump()
                if rehash:
                    result, id_map = rehash_config(result)
                    changed = {k: v for k, v in id_map.items() if k != v}
                    if changed:
                        st.warning("Page IDs that would change:")
                        for old, new in changed.items():
                            st.code(f"{old} → {new}")
                    else:
                        st.info("All page IDs already match their content hashes.")
                st.success("✅ Valid config!")
                st.json(result)
            except json.JSONDecodeError as e:
                st.error(f"Invalid JSON: {str(e)}")
            except Exception as e:
                st.error(f"Validation error: {str(e)}")
