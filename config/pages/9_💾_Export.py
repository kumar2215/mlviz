"""Export Page - Export and import configurations"""
import streamlit as st
import json
import sys
from pathlib import Path

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Config

st.set_page_config(page_title="Export", page_icon="💾")

st.header("Export Config")

# Initialize session state if not exists
if 'config' not in st.session_state:
    st.session_state.config = {"datasets": {}, "stories": {}, "pages": {}}

filename = st.text_input("Filename", value="config.json")

col1, col2 = st.columns(2)

with col1:
    if st.button("💾 Export to File", type="primary"):
        try:
            # Validate entire config
            config = Config.model_validate(st.session_state.config)
            
            output_path = Path(__file__).parent.parent / filename
            with open(output_path, "w") as f:
                json.dump(config.model_dump(), f, indent=2)
            
            st.success(f"✅ Config exported to: {output_path}")
            
        except Exception as e:
            st.error(f"Error: {str(e)}")

with col2:
    if st.button("📋 Copy JSON", type="secondary"):
        try:
            config = Config.model_validate(st.session_state.config)
            json_str = json.dumps(config.model_dump(), indent=2)
            st.code(json_str, language="json")
        except Exception as e:
            st.error(f"Error: {str(e)}")

st.divider()
st.subheader("Import Config from File")

uploaded_file = st.file_uploader("Upload JSON config", type=["json"])

if uploaded_file is not None:
    try:
        config_data = json.load(uploaded_file)
        config = Config.model_validate(config_data)
        st.session_state.config = config.model_dump()
        st.success("✅ Config imported successfully!")
        st.rerun()
    except Exception as e:
        st.error(f"Error importing config: {str(e)}")
