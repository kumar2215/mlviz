"""View Config Page - Display current configuration"""
import json

import streamlit as st

st.set_page_config(page_title="View Config", page_icon="📄")

st.header("Current Config")

# Initialize session state if not exists
if 'config' not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

col1, col2 = st.columns([3, 1])

config_json = json.dumps(st.session_state.config, indent=2)

with col1:
    # st.code renders with a built-in copy-to-clipboard button
    st.code(config_json, language="json")

with col2:
    st.metric("Datasets", len(st.session_state.config.get("datasets", {})))
    st.metric("Stories", len(st.session_state.config["stories"]))
    st.metric("Pages", len(st.session_state.config["pages"]))

    if st.button("🗑️ Clear Config", type="secondary"):
        st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}
        st.rerun()
