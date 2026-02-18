"""Edit Story Page - Modify existing stories"""

import sys
from pathlib import Path

import streamlit as st

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Story

st.set_page_config(page_title="Edit Story", page_icon="✏️", layout="wide")

st.header("✏️ Edit Story")

# Initialize session state if not exists
if "config" not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

# Check if there are any stories
if not st.session_state.config["stories"]:
    st.warning("⚠️ No stories found in config. Please add a story first!")
    st.stop()

# Select story to edit
st.subheader("Select Story to Edit")
story_names = list(st.session_state.config["stories"].keys())
selected_story_name = st.selectbox("Story", story_names)

if selected_story_name:
    # Load existing story data
    existing_story = st.session_state.config["stories"][selected_story_name]

    st.divider()
    st.subheader("Edit Story Details")

    # Story name (can be changed)
    new_story_name = st.text_input(
        "Story Name", value=selected_story_name, key="story_name_input"
    )

    col1, col2 = st.columns(2)

    with col1:
        name = st.text_input(
            "Name", value=existing_story.get("name", selected_story_name)
        )
        description = st.text_area(
            "Description", value=existing_story.get("description", "")
        )
        existing_nodes = existing_story.get("nodes", [])
        existing_start = existing_story.get("start_page", 0)
        start_page_index = st.number_input(
            "Start Page (node index)",
            min_value=0,
            max_value=max(len(existing_nodes) - 1, 0),
            value=min(existing_start, max(len(existing_nodes) - 1, 0)),
            help="Index of the node to use as the starting page",
        )

    with col2:
        # Get available pages
        available_pages = list(st.session_state.config["pages"].keys())
        if available_pages:
            st.info(f"📄 {len(available_pages)} page(s) available in config")
        else:
            st.warning("⚠️ No pages in config yet. Add pages first!")

    # Nodes section
    st.divider()
    st.subheader("Nodes")

    if not available_pages:
        st.error("Please add at least one page to the config before editing the story.")
        nodes_data = []
    else:
        from utils.form_helpers import render_node_list
        nodes_data = render_node_list(
            available_pages=available_pages,
            page_config=st.session_state.config["pages"],
            existing_nodes=existing_nodes,
            key_prefix=f"edit_story_{selected_story_name}_node"
        )

    # Edges section
    st.divider()
    st.subheader("Edges")

    # Get existing edges from the story
    existing_edges = existing_story.get("edges", [])

    edges_data = []
    if nodes_data and len(nodes_data) > 0:
        from utils.form_helpers import render_edge_list
        edges_data = render_edge_list(
            num_nodes=len(nodes_data),
            existing_edges=existing_edges,
            key_prefix=f"edit_story_{selected_story_name}_edge"
        )
    else:
        st.info("ℹ️ Add at least one node to configure edges")


    # Update button
    st.divider()
    col_btn1, col_btn2 = st.columns([1, 1])

    with col_btn1:
        if st.button("💾 Update Story", type="primary", use_container_width=True):
            if not new_story_name:
                st.error("Please provide a story name")
            elif not nodes_data:
                st.error("Please add at least one node to the story")
            else:
                try:
                    story_data = {
                        "name": name or new_story_name,
                        "description": description,
                        "start_page": start_page_index,
                        "nodes": nodes_data,
                        "edges": edges_data,
                    }

                    # Validate with Pydantic
                    story = Story.model_validate(story_data)

                    # If story name changed, remove old entry
                    if new_story_name != selected_story_name:
                        del st.session_state.config["stories"][selected_story_name]

                    # Update config
                    st.session_state.config["stories"][new_story_name] = (
                        story.model_dump()
                    )

                    st.success(
                        f"✅ Story '{new_story_name}' updated with {len(nodes_data)} node(s) and {len(edges_data)} edge(s)!"
                    )
                    st.json(story.model_dump())

                except Exception as e:
                    st.error(f"Error: {str(e)}")

    with col_btn2:
        if st.button("🗑️ Delete Story", type="secondary", use_container_width=True):
            if st.session_state.get("confirm_delete") == selected_story_name:
                del st.session_state.config["stories"][selected_story_name]
                st.session_state.confirm_delete = None
                st.success(f"✅ Story '{selected_story_name}' deleted!")
                st.rerun()
            else:
                st.session_state.confirm_delete = selected_story_name
                st.warning("⚠️ Click again to confirm deletion")
