"""Dataset models for config builder"""

from typing import Annotated, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class DatasetReference(BaseModel):
    """Reference to a dataset defined in the top-level datasets dict."""

    type: Literal["reference"] = "reference"
    name: str = Field(..., description="Name of the dataset in the datasets dict")


class PredefinedDataset(BaseModel):
    """A predefined sklearn classification dataset."""

    type: Literal["predefined"] = "predefined"
    name: Literal["wine", "iris", "breast_cancer", "digits", "simple_binary", "moons", "circles"] = Field(
        ..., description="Name of the predefined dataset"
    )
    test_size: float = Field(0.25, ge=0, le=0.9, description="Test split ratio")
    random_state: int = Field(2025, ge=0, description="Random state for reproducibility")


class CustomDataset(BaseModel):
    """A custom classification dataset with inline data."""

    type: Literal["custom"] = "custom"
    X: List[List[float]] = Field(..., description="Feature matrix")
    y: List[int] = Field(..., description="Integer class labels")
    feature_names: Optional[List[str]] = Field(
        None, description="Names for each feature"
    )
    target_names: Optional[List[str]] = Field(
        None, description="Names for each target class"
    )
    test_size: float = Field(0, ge=0, le=0.9, description="Test split ratio")
    random_state: int = Field(2025, ge=0, description="Random state for reproducibility")


class CustomRegressionDataset(BaseModel):
    """A custom regression dataset with inline data."""

    type: Literal["custom_regression"] = "custom_regression"
    X: List[List[float]] = Field(..., description="Feature matrix")
    y: List[float] = Field(..., description="Continuous target vector")
    feature_names: Optional[List[str]] = Field(
        None, description="Names for each feature"
    )
    target_name: Optional[str] = Field(
        "target", description="Name of the target variable"
    )
    test_size: float = Field(0.25, ge=0, le=0.9, description="Test split ratio")
    random_state: int = Field(2025, ge=0, description="Random state for reproducibility")


class PredefinedRegressionDataset(BaseModel):
    """A predefined regression dataset."""

    type: Literal["predefined_regression"] = "predefined_regression"
    name: Literal["simple", "diabetes", "california_housing"] = Field(
        ..., description="Name of the predefined regression dataset"
    )
    test_size: float = Field(0.25, ge=0, le=0.9, description="Test split ratio")
    random_state: int = Field(2025, ge=0, description="Random state for reproducibility")


# A dataset entry in the top-level datasets dict (custom classification or regression)
DatasetEntry = Annotated[
    Union[CustomDataset, CustomRegressionDataset],
    Field(discriminator="type"),
]

# A dataset on a page (reference to top-level, or inline predefined)
PageDataset = Annotated[
    Union[DatasetReference, PredefinedDataset, CustomDataset, CustomRegressionDataset, PredefinedRegressionDataset],
    Field(discriminator="type"),
]
