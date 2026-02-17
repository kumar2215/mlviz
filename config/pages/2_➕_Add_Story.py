"""Add Story Page - Create new stories with nodes and edges"""
import streamlit as st
import sys
from pathlib import Path

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Story

st.set_page_config(page_title="Add Story", page_icon="➕", layout="wide")

st.header("Add Story")

# Initialize session state if not exists
if 'config' not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

story_name = st.text_input("Story Name", placeholder="e.g., intro")

col1, col2 = st.columns(2)

with col1:
    name = st.text_input("Name", value=story_name)
    description = st.text_area("Description", placeholder="Story description")
    start_page_index = st.number_input(
        "Start Page (node index)",
        min_value=0,
        value=0,
        help="Index of the node to use as the starting page"
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
    st.error("Please add at least one page to the config before creating a story.")
    nodes_data = []
else:
    from utils.form_helpers import render_node_list
    nodes_data = render_node_list(
        available_pages=available_pages,
        page_config=st.session_state.config["pages"],
        existing_nodes=None,
        key_prefix="add_story_node"
    )

# Edges section
st.divider()
st.subheader("Edges (Optional)")

edges_data = []
if nodes_data and len(nodes_data) > 0:
    from utils.form_helpers import render_edge_list
    edges_data = render_edge_list(
        num_nodes=len(nodes_data),
        existing_edges=None,
        key_prefix="add_story_edge"
    )
else:
    st.info("ℹ️ Add at least one node to configure edges")
    
if st.button("➕ Add Story", type="primary"):
    if not story_name:
        st.error("Please provide a story name")
    elif not nodes_data:
        st.error("Please add at least one node to the story")
    elif start_page_index >= len(nodes_data):
        st.error(f"Start page index ({start_page_index}) must be less than the number of nodes ({len(nodes_data)})")
    else:
        try:
            story_data = {
                "name": name or story_name,
                "description": description,
                "start_page": start_page_index,
                "nodes": nodes_data,
                "edges": edges_data
            }
            
            # Validate with Pydantic
            story = Story.model_validate(story_data)
            
            # Add to config
            st.session_state.config["stories"][story_name] = story.model_dump()
            
            # Reset form state
            from utils.form_helpers import reset_form_state
            reset_form_state("add_story")
            
            st.success(f"✅ Story '{story_name}' added with {len(nodes_data)} node(s) and {len(edges_data)} edge(s)!")
            st.json(story.model_dump())
            
        except Exception as e:
            st.error(f"Error: {str(e)}")

