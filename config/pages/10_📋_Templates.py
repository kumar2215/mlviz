"""Templates Page - Load config templates from the templates folder"""

import json
from pathlib import Path

import streamlit as st

st.set_page_config(page_title="Templates", page_icon="📋")

st.header("Templates")

# Initialize session state if not exists
if "config" not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

# Discover templates from the templates folder
templates_dir = Path(__file__).parent.parent / "templates"
template_files = sorted(templates_dir.glob("*.json"))

if not template_files:
    st.warning("No templates found in the templates folder.")
    st.stop()

# Build name -> path mapping
template_names = {f.stem: f for f in template_files}

selected_name = st.selectbox("Select a template", list(template_names.keys()))

if selected_name:
    template_path = template_names[selected_name]
    template_data = json.loads(template_path.read_text())

    if st.button("Overwrite current config", type="primary"):
        st.session_state.config = template_data
        st.success(f"Config overwritten with **{selected_name}** template.")
        st.rerun()

    st.subheader("Preview")
    st.json(template_data)
