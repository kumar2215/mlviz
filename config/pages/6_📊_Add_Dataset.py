"""Add Dataset - Add custom datasets to the config"""
import json
import sys
from pathlib import Path

import streamlit as st

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import CustomDataset

st.set_page_config(page_title="Add Dataset", page_icon="📊", layout="wide")

st.header("Add Dataset")

st.markdown("""
Add custom datasets to the top-level `datasets` dict. Pages can then reference
them via `{"type": "reference", "name": "..."}`.

Predefined datasets (iris, wine, breast\_cancer, digits) don't need to be added
here — they are set directly on each page via `{"type": "predefined", "name": "..."}`.
""")

# Initialize session state if not exists
if "config" not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

if "datasets" not in st.session_state.config:
    st.session_state.config["datasets"] = {}

st.divider()

dataset_name = st.text_input(
    "Dataset Key",
    help="Unique name to reference this dataset from pages (e.g. 'my_dataset')",
)

st.markdown("Paste a custom dataset as JSON:")
json_text = st.text_area(
    "Dataset JSON",
    height=300,
    placeholder="""{
  "X": [[1.0, 2.0], [3.0, 4.0]],
  "y": [0, 1],
  "feature_names": ["feat_a", "feat_b"],
  "target_names": ["class_0", "class_1"],
  "test_size": 0.25,
  "random_state": 2025
}""",
)

if st.button("➕ Add Dataset", type="primary"):
    if not dataset_name.strip():
        st.error("Please provide a dataset key.")
    elif dataset_name in st.session_state.config["datasets"]:
        st.error(f"Dataset key '{dataset_name}' already exists.")
    elif not json_text.strip():
        st.error("Please paste dataset JSON.")
    else:
        try:
            data = json.loads(json_text)
            ds = CustomDataset.model_validate(data)
            st.session_state.config["datasets"][dataset_name] = ds.model_dump()
            st.success(f"Added custom dataset '{dataset_name}'")
            st.json(ds.model_dump())
        except json.JSONDecodeError as e:
            st.error(f"Invalid JSON: {e}")
        except Exception as e:
            st.error(f"Validation error: {e}")

# Show existing datasets
st.divider()
st.subheader("Current Datasets")

datasets = st.session_state.config.get("datasets", {})
if not datasets:
    st.info("No datasets added yet.")
else:
    for name, ds in datasets.items():
        with st.expander(f"**{name}** ({ds.get('type', 'unknown')})"):
            st.json(ds)
            if st.button(f"🗑️ Remove", key=f"remove_{name}"):
                del st.session_state.config["datasets"][name]
                st.rerun()
