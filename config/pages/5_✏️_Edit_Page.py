"""Edit Page - Modify existing pages in the config"""
import json
import sys
from pathlib import Path

import streamlit as st
from pydantic import BaseModel

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import model_pages, compute_object_hash, ModelPage

st.set_page_config(page_title="Edit Page", page_icon="✏️", layout="wide")

st.header("✏️ Edit Page")

# Initialize session state if not exists
if "config" not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

# Check if there are any pages
if not st.session_state.config["pages"]:
    st.warning("⚠️ No pages found in config. Please add a page first!")
    st.stop()

# Build a reverse lookup: page_type -> model class
page_type_to_model = {v.model_fields.get("page_type", None) and k: v for k, v in model_pages.items()}

# Build display labels for existing pages
page_ids = list(st.session_state.config["pages"].keys())
page_labels = {}
for pid in page_ids:
    page_data = st.session_state.config["pages"][pid]
    name = page_data.get("name") or pid
    ptype = page_data.get("page_type", "unknown")
    page_labels[pid] = f"{name} ({ptype}) [{pid}]"

# Select page to edit
st.subheader("Select Page to Edit")
selected_page_id = st.selectbox(
    "Page",
    options=page_ids,
    format_func=lambda pid: page_labels[pid],
)

if selected_page_id:
    existing_page = st.session_state.config["pages"][selected_page_id]

    # Determine which model class this page uses
    selected_model = None
    selected_model_key = None
    for model_key, model_cls in model_pages.items():
        try:
            model_cls.model_validate(existing_page)
            selected_model = model_cls
            selected_model_key = model_key
            break
        except Exception:
            continue

    if selected_model is None:
        st.error("Could not determine page type. The page data may not match any known model.")
        st.json(existing_page)
        st.stop()

    st.info(f"Page type: **{selected_model_key}**")

    st.divider()
    st.subheader("Edit Page Details")

    # Check if the model has a typed parameters field with actual fields
    has_typed_params = False
    if "parameters" in selected_model.model_fields:
        param_annotation = selected_model.model_fields["parameters"].annotation
        if (isinstance(param_annotation, type)
                and issubclass(param_annotation, BaseModel)
                and len(param_annotation.model_fields) > 0):
            has_typed_params = True

    # Exclude fields that are set automatically + dataset (handled manually below)
    exclude = ["page_type", "dynamic_type", "dataset"]
    if not has_typed_params:
        exclude.append("parameters")

    # Generate form with existing values pre-filled
    from utils.pydantic_form_generator import generate_form_from_pydantic_with_values

    form_data = generate_form_from_pydantic_with_values(
        selected_model,
        existing_values=existing_page,
        title=None,
        exclude_fields=exclude,
        key_prefix=f"edit_page_{selected_page_id}_",
    )

    # Show JSON box for parameters if the model doesn't have a typed parameters class
    if not has_typed_params and "parameters" in selected_model.model_fields:
        st.divider()
        st.subheader("Parameters")
        existing_params = existing_page.get("parameters", {})
        params_json = st.text_area(
            "Parameters (JSON)",
            value=json.dumps(existing_params, indent=2) if existing_params else "{}",
            height=150,
            help="Free-form JSON object for page parameters",
            key=f"edit_page_{selected_page_id}_params_json",
        )
        try:
            form_data["parameters"] = json.loads(params_json)
        except json.JSONDecodeError:
            st.error("Invalid JSON for parameters")

    # Dataset selector for model pages
    is_model_page = issubclass(selected_model, ModelPage)
    dataset_value = None

    if is_model_page:
        st.divider()
        st.subheader("Dataset")

        PREDEFINED_DATASETS = ["iris", "wine", "breast_cancer", "digits"]
        custom_datasets = list(st.session_state.config.get("datasets", {}).keys())

        # Determine existing dataset type
        existing_ds = existing_page.get("dataset")
        if existing_ds is None:
            default_ds_type_idx = 0  # None
        elif existing_ds.get("type") == "reference":
            default_ds_type_idx = 1
        elif existing_ds.get("type") == "predefined":
            default_ds_type_idx = 2
        else:
            default_ds_type_idx = 0

        ds_options = ["None", "reference", "predefined"]
        ds_type = st.selectbox(
            "Dataset Type",
            options=ds_options,
            index=default_ds_type_idx,
            help="'reference' links to a custom dataset added in Add Dataset. "
                 "'predefined' uses a built-in sklearn dataset.",
            key=f"edit_page_{selected_page_id}_dataset_type",
        )

        if ds_type == "reference":
            if not custom_datasets:
                st.warning("No custom datasets added yet. Add one in the Add Dataset page first.")
            else:
                default_ref = existing_ds.get("name", custom_datasets[0]) if existing_ds and existing_ds.get("type") == "reference" else custom_datasets[0]
                default_idx = custom_datasets.index(default_ref) if default_ref in custom_datasets else 0
                ds_name = st.selectbox(
                    "Dataset Name",
                    options=custom_datasets,
                    index=default_idx,
                    key=f"edit_page_{selected_page_id}_dataset_ref_name",
                )
                dataset_value = {"type": "reference", "name": ds_name}

        elif ds_type == "predefined":
            default_pred = existing_ds.get("name", PREDEFINED_DATASETS[0]) if existing_ds and existing_ds.get("type") == "predefined" else PREDEFINED_DATASETS[0]
            default_idx = PREDEFINED_DATASETS.index(default_pred) if default_pred in PREDEFINED_DATASETS else 0
            ds_name = st.selectbox(
                "Dataset Name",
                options=PREDEFINED_DATASETS,
                index=default_idx,
                key=f"edit_page_{selected_page_id}_dataset_pred_name",
            )
            dataset_value = {"type": "predefined", "name": ds_name}

    # Action buttons
    st.divider()
    col_btn1, col_btn2 = st.columns([1, 1])

    with col_btn1:
        if st.button("💾 Update Page", type="primary", use_container_width=True):
            try:
                if dataset_value is not None:
                    form_data["dataset"] = dataset_value

                page_instance = selected_model.model_validate(form_data)
                new_page_id = str(compute_object_hash(page_instance))

                # Remove old entry if hash changed
                if new_page_id != selected_page_id:
                    del st.session_state.config["pages"][selected_page_id]

                    # Update all story node references from old ID to new ID
                    updated_stories = []
                    for story_name, story_data in st.session_state.config["stories"].items():
                        changed = False
                        for node in story_data.get("nodes", []):
                            if node.get("index") == selected_page_id:
                                node["index"] = new_page_id
                                changed = True
                        if changed:
                            updated_stories.append(story_name)

                    if updated_stories:
                        st.info(
                            f"Updated page references in {len(updated_stories)} "
                            f"story/stories: {', '.join(updated_stories)}"
                        )

                # Update config
                st.session_state.config["pages"][new_page_id] = page_instance.model_dump()

                st.success(f"✅ Page updated! ID: {new_page_id}")

                col1, col2 = st.columns(2)
                with col1:
                    st.subheader("Page Data")
                    st.json(page_instance.model_dump())
                with col2:
                    st.subheader("Page ID")
                    st.code(new_page_id)
                    st.metric("Total Pages", len(st.session_state.config["pages"]))

                if new_page_id != selected_page_id:
                    st.info(f"Page ID changed from {selected_page_id} → {new_page_id}")
                    st.rerun()

            except Exception as e:
                st.error(f"❌ Error: {str(e)}")

    with col_btn2:
        if st.button("🗑️ Delete Page", type="secondary", use_container_width=True):
            if st.session_state.get("confirm_delete_page") == selected_page_id:
                del st.session_state.config["pages"][selected_page_id]
                st.session_state.confirm_delete_page = None
                st.success(f"✅ Page '{selected_page_id}' deleted!")
                st.rerun()
            else:
                st.session_state.confirm_delete_page = selected_page_id
                st.warning("⚠️ Click again to confirm deletion")
