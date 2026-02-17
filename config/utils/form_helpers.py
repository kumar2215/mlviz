"""
Form Helper Utilities for Story Configuration

Provides reusable UI components for node and edge management.
"""

import streamlit as st
from typing import List, Dict, Any, Optional


def render_node_list(
    available_pages: List[str],
    page_config: Dict[str, Any],
    existing_nodes: Optional[List[Dict[str, str]]] = None,
    key_prefix: str = "node"
) -> List[Dict[str, str]]:
    """
    Render a dynamic node list with add/remove functionality.
    
    Args:
        available_pages: List of available page IDs
        page_config: Dictionary of page configurations
        existing_nodes: Optional list of existing nodes to pre-populate
        key_prefix: Prefix for Streamlit widget keys
        
    Returns:
        List of node dictionaries with 'index' key
    """
    # Initialize session state for nodes if not exists
    if f'{key_prefix}_list' not in st.session_state:
        st.session_state[f'{key_prefix}_list'] = existing_nodes or []
    
    nodes = st.session_state[f'{key_prefix}_list']
    
    # Add node button
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("**Nodes** (in order)")
    with col2:
        if st.button("➕ Add Node", key=f"{key_prefix}_add_btn", use_container_width=True):
            # Add a new node with the first available page
            if available_pages:
                nodes.append({"index": available_pages[0]})
                st.rerun()
    
    # Display nodes
    if not nodes:
        st.info("👆 Click 'Add Node' to start building your story")
        return []
    
    nodes_to_remove = []
    updated_nodes = []
    
    for i, node in enumerate(nodes):
        col_idx, col_page, col_remove = st.columns([0.5, 4, 0.5])
        
        with col_idx:
            st.markdown(f"**{i}**")
        
        with col_page:
            # Create page options with display names
            page_options = {}
            for page_id in available_pages:
                page = page_config[page_id]
                display_name = page.get('name') or page.get('page_type', 'unknown')
                page_options[page_id] = f"{page_id} - {display_name}"
            
            # Get current selection or default to first
            current_page = node.get('index', available_pages[0])
            if current_page not in available_pages:
                current_page = available_pages[0]
            
            selected_page = st.selectbox(
                f"Page for node {i}",
                options=list(page_options.keys()),
                format_func=lambda x: page_options[x],
                index=list(page_options.keys()).index(current_page) if current_page in page_options else 0,
                key=f"{key_prefix}_select_{i}",
                label_visibility="collapsed"
            )
            updated_nodes.append({"index": selected_page})
        
        with col_remove:
            if st.button("🗑️", key=f"{key_prefix}_remove_{i}", help=f"Remove node {i}"):
                nodes_to_remove.append(i)
    
    # Remove nodes if any were marked for removal
    if nodes_to_remove:
        for idx in sorted(nodes_to_remove, reverse=True):
            nodes.pop(idx)
        st.session_state[f'{key_prefix}_list'] = nodes
        st.rerun()
    else:
        # Update session state with new selections
        st.session_state[f'{key_prefix}_list'] = updated_nodes
    
    return updated_nodes


def render_edge_list(
    num_nodes: int,
    existing_edges: Optional[List[Dict[str, Any]]] = None,
    key_prefix: str = "edge"
) -> List[Dict[str, Any]]:
    """
    Render a simplified edge list with add/remove functionality.
    
    Args:
        num_nodes: Number of nodes available
        existing_edges: Optional list of existing edges to pre-populate
        key_prefix: Prefix for Streamlit widget keys
        
    Returns:
        List of edge dictionaries
    """
    # Initialize session state for edges if not exists
    if f'{key_prefix}_list' not in st.session_state:
        st.session_state[f'{key_prefix}_list'] = existing_edges or []
    
    edges = st.session_state[f'{key_prefix}_list']
    
    # Show existing edges if any
    if edges:
        with st.expander(f"📋 Current Edges ({len(edges)})", expanded=False):
            for i, edge in enumerate(edges):
                start_idx = edge.get("start", {}).get("local_index", "?")
                end_idx = edge.get("end", {}).get("local_index", "?")
                cond_type = edge.get("condition", {}).get("condition_type", "Unknown")
                st.markdown(f"**Edge {i}:** {start_idx} → {end_idx} ({cond_type})")
    
    # Quick setup buttons
    st.markdown("**Quick Setup**")
    col_seq, col_add, col_clear = st.columns(3)
    
    with col_seq:
        if st.button(
            "➕ Add Sequential Edges",
            key=f"{key_prefix}_add_sequential",
            help="Add edges connecting nodes in order (0→1→2→3...)",
            use_container_width=True
        ):
            # Add sequential edges to existing edges
            sequential_edges = create_sequential_edges(num_nodes)
            edges.extend(sequential_edges)
            st.session_state[f'{key_prefix}_list'] = edges
            st.rerun()
    
    with col_add:
        if st.button(
            "➕ Add Custom Edge",
            key=f"{key_prefix}_add_btn",
            help="Add a single custom edge",
            use_container_width=True
        ):
            # Add a new edge with default values
            edges.append({
                "start": {"local_index": 0, "story_name": None},
                "end": {"local_index": min(1, num_nodes - 1), "story_name": None},
                "condition": {"condition_type": "Bypass"}
            })
            st.rerun()
    
    with col_clear:
        if st.button(
            "🗑️ Clear All",
            key=f"{key_prefix}_clear_all",
            help="Remove all edges",
            use_container_width=True,
            disabled=(len(edges) == 0)
        ):
            st.session_state[f'{key_prefix}_list'] = []
            st.rerun()
    
    st.divider()
    
    # Manual edge editing
    st.markdown("**Edges**")
    
    if not edges:
        st.info("👆 Click 'Add Edge' to create custom navigation paths")
        return []
    
    edges_to_remove = []
    updated_edges = []
    
    for i, edge in enumerate(edges):
        with st.container():
            col_from, col_arrow, col_to, col_cond, col_config, col_remove = st.columns([1.5, 0.3, 1.5, 1.5, 0.8, 0.5])
            
            with col_from:
                start_idx = st.selectbox(
                    "From",
                    options=list(range(num_nodes)),
                    index=min(edge.get("start", {}).get("local_index", 0), num_nodes - 1),
                    key=f"{key_prefix}_from_{i}",
                    label_visibility="collapsed" if i > 0 else "visible"
                )
            
            with col_arrow:
                st.markdown("→" if i > 0 else "**→**")
            
            with col_to:
                end_idx = st.selectbox(
                    "To",
                    options=list(range(num_nodes)),
                    index=min(edge.get("end", {}).get("local_index", 0), num_nodes - 1),
                    key=f"{key_prefix}_to_{i}",
                    label_visibility="collapsed" if i > 0 else "visible"
                )
            
            with col_cond:
                condition_types = ["Bypass", "Parameter", "Time", "Button", "Lambda", "Slide"]
                current_cond_type = edge.get("condition", {}).get("condition_type", "Bypass")
                cond_type = st.selectbox(
                    "Condition",
                    options=condition_types,
                    index=condition_types.index(current_cond_type) if current_cond_type in condition_types else 0,
                    key=f"{key_prefix}_cond_{i}",
                    label_visibility="collapsed" if i > 0 else "visible"
                )
            
            with col_config:
                show_config = st.button(
                    "⚙️",
                    key=f"{key_prefix}_config_{i}",
                    help="Configure condition details",
                    disabled=(cond_type == "Bypass")
                )
            
            with col_remove:
                if st.button("🗑️", key=f"{key_prefix}_remove_{i}", help=f"Remove edge {i}"):
                    edges_to_remove.append(i)
            
            # Advanced options for cross-story navigation
            with st.expander(f"⚙️ Advanced Options (Edge {i})", expanded=False):
                st.markdown("**Cross-Story Navigation** (optional)")
                st.caption("Leave empty to navigate within the current story")
                
                col_start, col_end = st.columns(2)
                
                with col_start:
                    st.markdown("**Start Node**")
                    start_story_name = st.text_input(
                        "Story Name",
                        value=edge.get("start", {}).get("story_name") or "",
                        key=f"{key_prefix}_start_story_{i}",
                        placeholder="Current story",
                        help="Specify a different story name to start from a node in another story"
                    )
                    # Allow custom local index if story name is specified
                    if start_story_name:
                        start_custom_idx = st.number_input(
                            "Custom Local Index",
                            min_value=0,
                            value=edge.get("start", {}).get("local_index", 0),
                            key=f"{key_prefix}_start_custom_idx_{i}",
                            help="Node index in the specified story"
                        )
                        start_idx = start_custom_idx
                
                with col_end:
                    st.markdown("**End Node**")
                    end_story_name = st.text_input(
                        "Story Name",
                        value=edge.get("end", {}).get("story_name") or "",
                        key=f"{key_prefix}_end_story_{i}",
                        placeholder="Current story",
                        help="Specify a different story name to navigate to a node in another story"
                    )
                    # Allow custom local index if story name is specified
                    if end_story_name:
                        end_custom_idx = st.number_input(
                            "Custom Local Index",
                            min_value=0,
                            value=edge.get("end", {}).get("local_index", 0),
                            key=f"{key_prefix}_end_custom_idx_{i}",
                            help="Node index in the specified story"
                        )
                        end_idx = end_custom_idx
            
            # Build basic edge
            condition = render_condition_config(
                cond_type,
                edge.get("condition", {}),
                i,
                key_prefix,
                show_details=show_config
            )
            
            updated_edge = {
                "start": {
                    "local_index": start_idx,
                    "story_name": start_story_name if start_story_name else None
                },
                "end": {
                    "local_index": end_idx,
                    "story_name": end_story_name if end_story_name else None
                },
                "condition": condition
            }
            updated_edges.append(updated_edge)
    
    # Remove edges if any were marked for removal
    if edges_to_remove:
        for idx in sorted(edges_to_remove, reverse=True):
            edges.pop(idx)
        st.session_state[f'{key_prefix}_list'] = edges
        st.rerun()
    else:
        # Update session state
        st.session_state[f'{key_prefix}_list'] = updated_edges
    
    return updated_edges


def create_sequential_edges(num_nodes: int) -> List[Dict[str, Any]]:
    """
    Create sequential edges connecting nodes in order (0→1→2→3...).
    
    Args:
        num_nodes: Number of nodes
        
    Returns:
        List of edge dictionaries with Bypass conditions
    """
    edges = []
    for i in range(num_nodes - 1):
        edges.append({
            "start": {"local_index": i, "story_name": None},
            "end": {"local_index": i + 1, "story_name": None},
            "condition": {"condition_type": "Bypass"}
        })
    return edges


def render_condition_config(
    condition_type: str,
    existing_condition: Dict[str, Any],
    edge_index: int,
    key_prefix: str,
    show_details: bool = False
) -> Dict[str, Any]:
    """
    Render condition configuration form.
    
    Args:
        condition_type: Type of condition
        existing_condition: Existing condition data
        edge_index: Index of the edge
        key_prefix: Prefix for widget keys
        show_details: Whether to show detailed configuration
        
    Returns:
        Condition dictionary
    """
    condition = {"condition_type": condition_type}
    
    if condition_type == "Bypass":
        return condition
    
    # Show detailed config in expander if requested
    if show_details:
        with st.expander(f"⚙️ Configure {condition_type} Condition for Edge {edge_index}", expanded=True):
            # Optional display overrides (common to all types)
            cond_name = st.text_input(
                "Display Name (optional)",
                value=existing_condition.get("name", "") or "",
                key=f"{key_prefix}_cond_name_{edge_index}",
                placeholder="Override navigation button title"
            )
            cond_description = st.text_area(
                "Display Description (optional)",
                value=existing_condition.get("description", "") or "",
                key=f"{key_prefix}_cond_desc_{edge_index}",
                placeholder="Override navigation button description"
            )
            
            if condition_type == "Parameter":
                col_p1, col_p2, col_p3 = st.columns(3)
                with col_p1:
                    category = st.text_input(
                        "Category",
                        value=existing_condition.get("category", ""),
                        key=f"{key_prefix}_cat_{edge_index}"
                    )
                with col_p2:
                    parameter = st.text_input(
                        "Parameter",
                        value=existing_condition.get("parameter", ""),
                        key=f"{key_prefix}_param_{edge_index}"
                    )
                with col_p3:
                    comparators = ["<", "<=", ">=", ">", "="]
                    default_comp = existing_condition.get("comparator", "<")
                    comparator = st.selectbox(
                        "Comparator",
                        comparators,
                        index=comparators.index(default_comp) if default_comp in comparators else 0,
                        key=f"{key_prefix}_comp_{edge_index}"
                    )
                value = st.text_input(
                    "Value",
                    value=str(existing_condition.get("value", "")),
                    key=f"{key_prefix}_val_{edge_index}"
                )
                
                condition.update({
                    "category": category,
                    "parameter": parameter,
                    "comparator": comparator,
                    "value": value
                })
            
            elif condition_type == "Time":
                wait = st.number_input(
                    "Wait (seconds)",
                    min_value=0,
                    value=existing_condition.get("wait", 5),
                    key=f"{key_prefix}_wait_{edge_index}"
                )
                condition["wait"] = wait
            
            elif condition_type == "Button":
                button_id = st.text_input(
                    "Button ID",
                    value=existing_condition.get("button_id", ""),
                    key=f"{key_prefix}_btn_{edge_index}"
                )
                condition["button_id"] = button_id
            
            elif condition_type == "Lambda":
                exec_str = st.text_area(
                    "Lambda Expression",
                    value=existing_condition.get("exec_str", ""),
                    key=f"{key_prefix}_lambda_{edge_index}",
                    placeholder="e.g., x > 5"
                )
                condition["exec_str"] = exec_str
            
            elif condition_type == "Slide":
                slide_name = st.text_input(
                    "Slide Name",
                    value=existing_condition.get("slide_name", ""),
                    key=f"{key_prefix}_slide_name_{edge_index}"
                )
                slide_desc = st.text_input(
                    "Slide Description (optional)",
                    value=existing_condition.get("slide_description", "") or "",
                    key=f"{key_prefix}_slide_desc_{edge_index}"
                )
                condition["slide_name"] = slide_name
                if slide_desc:
                    condition["slide_description"] = slide_desc
            
            # Add display overrides if provided
            if cond_name:
                condition["name"] = cond_name
            if cond_description:
                condition["description"] = cond_description
    
    return condition


def reset_form_state(key_prefix: str):
    """
    Reset form state for nodes and edges.
    
    Args:
        key_prefix: Prefix used for the form state keys
    """
    if f'{key_prefix}_node_list' in st.session_state:
        del st.session_state[f'{key_prefix}_node_list']
    if f'{key_prefix}_edge_list' in st.session_state:
        del st.session_state[f'{key_prefix}_edge_list']
