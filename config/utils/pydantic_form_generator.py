"""
Automatic Streamlit Form Generator from Pydantic Models

This module provides utilities to automatically generate Streamlit forms
from Pydantic model definitions, eliminating the need for manual form creation.

Supports:
- Fixed defaults (default_factory)
- Nested Pydantic models
- Optional fields
- List types
- Basic types (bool, int, float, str)
"""

import streamlit as st
import json
from typing import Any, Type, get_origin, get_args
from pydantic import BaseModel
from pydantic.fields import FieldInfo
from pydantic_core import PydanticUndefined


def get_field_default(field_info: FieldInfo) -> Any:
    """
    Get the default value for a field, handling default_factory.
    
    Args:
        field_info: Pydantic FieldInfo object
    
    Returns:
        Default value or None if not set
    """
    # Check if default is set
    if field_info.default is not PydanticUndefined:
        return field_info.default
    
    # Check if default_factory is set
    if field_info.default_factory is not None:
        try:
            return field_info.default_factory()
        except:
            return None
    
    return None


def is_pydantic_model(annotation: Any) -> bool:
    """Check if a type annotation is a Pydantic BaseModel subclass."""
    try:
        return isinstance(annotation, type) and issubclass(annotation, BaseModel)
    except TypeError:
        return False


def get_streamlit_widget(field_name: str, field_info: FieldInfo, annotation: Any, prefix: str = "") -> Any:
    """
    Generate appropriate Streamlit widget based on field type.
    
    Args:
        field_name: Name of the field
        field_info: Pydantic FieldInfo object
        annotation: Type annotation of the field
        prefix: Prefix for nested fields (for unique keys)
    
    Returns:
        Value from the Streamlit widget
    """
    # Get field metadata
    description = field_info.description or ""
    default = get_field_default(field_info)
    required = field_info.is_required()
    
    # Create label
    label = field_name.replace("_", " ").title()
    if required:
        label += " *"
    
    # Create unique key
    key = f"{prefix}field_{field_name}" if prefix else f"field_{field_name}"
    
    # Get the actual type (handle Optional, Union, etc.)
    origin = get_origin(annotation)
    args = get_args(annotation)
    
    # Handle Optional types (Union[X, None])
    if origin is type(None) or (args and type(None) in args):
        # It's Optional, get the actual type
        actual_type = args[0] if args else annotation
    else:
        actual_type = annotation
    
    # Re-check origin after unwrapping Optional
    origin = get_origin(actual_type)
    args = get_args(actual_type)
    
    # Handle nested Pydantic models
    if is_pydantic_model(actual_type):
        st.markdown(f"**{label}**")
        if description:
            st.caption(description)
        
        # Generate nested form
        nested_data = {}
        for nested_field_name, nested_field_info in actual_type.model_fields.items():
            nested_annotation = nested_field_info.annotation
            nested_data[nested_field_name] = get_streamlit_widget(
                nested_field_name,
                nested_field_info,
                nested_annotation,
                prefix=f"{key}_"
            )
        
        # Return the nested model instance
        try:
            return actual_type.model_validate(nested_data)
        except Exception as e:
            st.error(f"Error validating nested model {label}: {e}")
            return None
    
    # Generate widget based on type
    if actual_type is bool or actual_type == bool:
        default_val = default if default is not None else False
        return st.checkbox(
            label,
            value=default_val,
            help=description,
            key=key
        )
    
    elif actual_type is int or actual_type == int:
        default_val = default if default is not None else 0
        return st.number_input(
            label,
            value=default_val,
            step=1,
            help=description,
            key=key
        )
    
    elif actual_type is float or actual_type == float:
        default_val = default if default is not None else 0.0
        return st.number_input(
            label,
            value=default_val,
            step=0.1,
            help=description,
            key=key
        )
    
    elif origin is list:
        # Handle list types
        inner_type = args[0] if args else str
        
        if inner_type is int or inner_type == int:
            # List of integers - use comma-separated input
            default_val = default if default is not None else []
            default_str = ",".join(map(str, default_val)) if default_val else ""
            input_str = st.text_input(
                label,
                value=default_str,
                help=f"{description} (comma-separated integers)" if description else "Comma-separated integers",
                key=key
            )
            if not input_str.strip():
                return []
            try:
                return [int(x.strip()) for x in input_str.split(",") if x.strip()]
            except ValueError:
                st.error(f"Invalid input for {label}. Please enter comma-separated integers.")
                return default_val if default_val else []
        
        elif inner_type is str or inner_type == str:
            # List of strings - use comma-separated input
            default_val = default if default is not None else []
            default_str = ",".join(default_val) if default_val else ""
            input_str = st.text_input(
                label,
                value=default_str,
                help=f"{description} (comma-separated values)" if description else "Comma-separated values",
                key=key
            )
            if not input_str.strip():
                return []
            return [x.strip() for x in input_str.split(",") if x.strip()]
        
        else:
            # Generic list - use text area with JSON
            default_val = default if default is not None else []
            default_json = json.dumps(default_val, indent=2)
            input_str = st.text_area(
                label,
                value=default_json,
                help=f"{description} (JSON array)" if description else "JSON array",
                key=key,
                height=100
            )
            try:
                return json.loads(input_str)
            except json.JSONDecodeError:
                st.error(f"Invalid JSON for {label}")
                return default_val if default_val else []
    
    else:
        # Check for widget override via json_schema_extra
        extra = field_info.json_schema_extra or {}
        widget = extra.get("widget", "text_input")

        default_val = default if default is not None else ""
        if widget == "textarea":
            return st.text_area(
                label,
                value=str(default_val) if default_val is not None else "",
                help=description,
                key=key
            )
        return st.text_input(
            label,
            value=str(default_val) if default_val is not None else "",
            help=description,
            key=key
        )


def generate_form_from_pydantic(
    model_class: Type[BaseModel],
    title: str | None = None,
    exclude_fields: list[str] | None = None,
    key_prefix: str = ""
) -> dict[str, Any]:
    """
    Automatically generate a Streamlit form from a Pydantic model.

    Args:
        model_class: Pydantic model class to generate form for
        title: Optional title for the form section
        exclude_fields: List of field names to exclude from the form
        key_prefix: Prefix for widget keys to ensure uniqueness across different models

    Returns:
        Dictionary of field values from the form
    """
    exclude_fields = exclude_fields or []

    if title:
        st.subheader(title)

    form_data = {}

    # Iterate through model fields
    for field_name, field_info in model_class.model_fields.items():
        if field_name in exclude_fields:
            continue

        # Get the field's type annotation
        annotation = field_info.annotation

        # Generate widget and collect value
        form_data[field_name] = get_streamlit_widget(field_name, field_info, annotation, prefix=key_prefix)

    return form_data


def get_streamlit_widget_with_value(
    field_name: str, field_info: FieldInfo, annotation: Any,
    existing_value: Any = None, prefix: str = ""
) -> Any:
    """
    Generate a Streamlit widget pre-filled with an existing value.

    Falls back to model defaults when existing_value is None.
    """
    description = field_info.description or ""
    default = existing_value if existing_value is not None else get_field_default(field_info)
    required = field_info.is_required()

    label = field_name.replace("_", " ").title()
    if required:
        label += " *"

    key = f"{prefix}field_{field_name}" if prefix else f"field_{field_name}"

    origin = get_origin(annotation)
    args = get_args(annotation)

    # Handle Optional types
    if origin is type(None) or (args and type(None) in args):
        actual_type = args[0] if args else annotation
    else:
        actual_type = annotation

    origin = get_origin(actual_type)
    args = get_args(actual_type)

    # Handle nested Pydantic models
    if is_pydantic_model(actual_type):
        st.markdown(f"**{label}**")
        if description:
            st.caption(description)

        nested_existing = existing_value if isinstance(existing_value, dict) else {}
        nested_data = {}
        for nested_field_name, nested_field_info in actual_type.model_fields.items():
            nested_annotation = nested_field_info.annotation
            nested_data[nested_field_name] = get_streamlit_widget_with_value(
                nested_field_name,
                nested_field_info,
                nested_annotation,
                existing_value=nested_existing.get(nested_field_name),
                prefix=f"{key}_"
            )

        try:
            return actual_type.model_validate(nested_data)
        except Exception as e:
            st.error(f"Error validating nested model {label}: {e}")
            return None

    if actual_type is bool or actual_type == bool:
        default_val = default if default is not None else False
        return st.checkbox(label, value=default_val, help=description, key=key)

    elif actual_type is int or actual_type == int:
        default_val = default if default is not None else 0
        return st.number_input(label, value=int(default_val), step=1, help=description, key=key)

    elif actual_type is float or actual_type == float:
        default_val = default if default is not None else 0.0
        return st.number_input(label, value=float(default_val), step=0.1, help=description, key=key)

    elif origin is list:
        inner_type = args[0] if args else str
        default_val = default if default is not None else []

        if inner_type is int or inner_type == int:
            default_str = ",".join(map(str, default_val)) if default_val else ""
            input_str = st.text_input(
                label, value=default_str,
                help=f"{description} (comma-separated integers)" if description else "Comma-separated integers",
                key=key
            )
            if not input_str.strip():
                return []
            try:
                return [int(x.strip()) for x in input_str.split(",") if x.strip()]
            except ValueError:
                st.error(f"Invalid input for {label}. Please enter comma-separated integers.")
                return default_val if default_val else []

        elif inner_type is str or inner_type == str:
            default_str = ",".join(default_val) if default_val else ""
            input_str = st.text_input(
                label, value=default_str,
                help=f"{description} (comma-separated values)" if description else "Comma-separated values",
                key=key
            )
            if not input_str.strip():
                return []
            return [x.strip() for x in input_str.split(",") if x.strip()]

        else:
            default_json = json.dumps(default_val, indent=2)
            input_str = st.text_area(
                label, value=default_json,
                help=f"{description} (JSON array)" if description else "JSON array",
                key=key, height=100
            )
            try:
                return json.loads(input_str)
            except json.JSONDecodeError:
                st.error(f"Invalid JSON for {label}")
                return default_val if default_val else []

    else:
        extra = field_info.json_schema_extra or {}
        widget = extra.get("widget", "text_input")
        default_val = default if default is not None else ""
        if widget == "textarea":
            return st.text_area(
                label, value=str(default_val) if default_val is not None else "",
                help=description, key=key
            )
        return st.text_input(
            label, value=str(default_val) if default_val is not None else "",
            help=description, key=key
        )


def generate_form_from_pydantic_with_values(
    model_class: Type[BaseModel],
    existing_values: dict[str, Any] | None = None,
    title: str | None = None,
    exclude_fields: list[str] | None = None,
    key_prefix: str = ""
) -> dict[str, Any]:
    """
    Generate a Streamlit form from a Pydantic model, pre-filled with existing values.

    Args:
        model_class: Pydantic model class to generate form for
        existing_values: Dictionary of existing values to pre-fill the form
        title: Optional title for the form section
        exclude_fields: List of field names to exclude from the form
        key_prefix: Prefix for widget keys to ensure uniqueness

    Returns:
        Dictionary of field values from the form
    """
    exclude_fields = exclude_fields or []
    existing_values = existing_values or {}

    if title:
        st.subheader(title)

    form_data = {}

    for field_name, field_info in model_class.model_fields.items():
        if field_name in exclude_fields:
            continue

        annotation = field_info.annotation
        form_data[field_name] = get_streamlit_widget_with_value(
            field_name, field_info, annotation,
            existing_value=existing_values.get(field_name),
            prefix=key_prefix
        )

    return form_data


def generate_form_with_validation(
    model_class: Type[BaseModel],
    title: str | None = None,
    exclude_fields: list[str] | None = None,
    submit_label: str = "Submit",
    key_prefix: str = ""
) -> BaseModel | None:
    """
    Generate a Streamlit form with a submit button and automatic validation.

    Args:
        model_class: Pydantic model class to generate form for
        title: Optional title for the form section
        exclude_fields: List of field names to exclude from the form
        submit_label: Label for the submit button
        key_prefix: Prefix for widget keys to ensure uniqueness across different models

    Returns:
        Validated Pydantic model instance if submitted successfully, None otherwise
    """
    form_data = generate_form_from_pydantic(model_class, title, exclude_fields, key_prefix=key_prefix)
    
    if st.button(submit_label, type="primary"):
        try:
            # Validate using Pydantic
            instance = model_class.model_validate(form_data)
            st.success("✅ Validation successful!")
            return instance
        except Exception as e:
            st.error(f"❌ Validation error: {str(e)}")
            return None
    
    return None
