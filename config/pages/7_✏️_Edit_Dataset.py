"""Edit Dataset - Modify existing custom datasets in the config"""
import json
import sys
from pathlib import Path

import streamlit as st

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import CustomDataset

st.set_page_config(page_title="Edit Dataset", page_icon="✏️", layout="wide")

st.header("✏️ Edit Dataset")

# Initialize session state if not exists
if "config" not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

if "datasets" not in st.session_state.config:
    st.session_state.config["datasets"] = {}

datasets = st.session_state.config["datasets"]

# Check if there are any datasets
if not datasets:
    st.warning("⚠️ No datasets found in config. Please add a dataset first!")
    st.stop()

# Select dataset to edit
st.subheader("Select Dataset to Edit")
dataset_names = list(datasets.keys())
selected_name = st.selectbox("Dataset", dataset_names)

if selected_name:
    existing_ds = datasets[selected_name]

    st.divider()
    st.subheader("Edit Dataset Details")

    # Dataset key (can be renamed)
    new_name = st.text_input(
        "Dataset Key",
        value=selected_name,
        help="Unique name to reference this dataset from pages",
        key=f"edit_ds_{selected_name}_key",
    )

    st.markdown("Edit dataset JSON:")
    json_text = st.text_area(
        "Dataset JSON",
        value=json.dumps(existing_ds, indent=2),
        height=300,
        key=f"edit_ds_{selected_name}_json",
    )

    # Action buttons
    st.divider()
    col_btn1, col_btn2 = st.columns([1, 1])

    with col_btn1:
        if st.button("💾 Update Dataset", type="primary", use_container_width=True):
            if not new_name.strip():
                st.error("Please provide a dataset key.")
            elif not json_text.strip():
                st.error("Please provide dataset JSON.")
            elif new_name != selected_name and new_name in datasets:
                st.error(f"Dataset key '{new_name}' already exists.")
            else:
                try:
                    data = json.loads(json_text)
                    ds = CustomDataset.model_validate(data)

                    # Remove old entry if name changed
                    if new_name != selected_name:
                        del st.session_state.config["datasets"][selected_name]

                        # Update all page dataset references from old name to new name
                        updated_pages = []
                        for page_id, page_data in st.session_state.config["pages"].items():
                            ds_ref = page_data.get("dataset")
                            if (ds_ref
                                    and ds_ref.get("type") == "reference"
                                    and ds_ref.get("name") == selected_name):
                                page_data["dataset"]["name"] = new_name
                                updated_pages.append(page_id)

                        if updated_pages:
                            st.info(
                                f"Updated dataset references in {len(updated_pages)} "
                                f"page(s): {', '.join(updated_pages)}"
                            )

                    st.session_state.config["datasets"][new_name] = ds.model_dump()
                    st.success(f"✅ Dataset '{new_name}' updated!")
                    st.json(ds.model_dump())

                    if new_name != selected_name:
                        st.info(f"Dataset key changed from '{selected_name}' → '{new_name}'")
                        st.rerun()

                except json.JSONDecodeError as e:
                    st.error(f"❌ Invalid JSON: {e}")
                except Exception as e:
                    st.error(f"❌ Validation error: {e}")

    with col_btn2:
        if st.button("🗑️ Delete Dataset", type="secondary", use_container_width=True):
            if st.session_state.get("confirm_delete_dataset") == selected_name:
                del st.session_state.config["datasets"][selected_name]
                st.session_state.confirm_delete_dataset = None
                st.success(f"✅ Dataset '{selected_name}' deleted!")
                st.rerun()
            else:
                st.session_state.confirm_delete_dataset = selected_name
                st.warning("⚠️ Click again to confirm deletion")
