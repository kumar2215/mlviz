from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, Field, field_validator
import numpy as np


class DatasetInfo(BaseModel):
    """Metadata about a dataset."""
    name: str
    description: Optional[str] = None
    n_samples: int
    n_features: int
    n_classes: int
    target_type: Literal["classification", "regression"] = "classification"


class ClassificationDataset(BaseModel):
    """Complete dataset with features and targets (for classification)."""
    type: Literal["custom"] = Field("custom", description="Discriminator for Union type")
    X: List[List[float]] = Field(..., description="Feature matrix")
    y: List[int] = Field(..., description="Target vector")
    feature_names: Optional[List[str]] = None
    target_names: Optional[List[str]] = None
    info: Optional[DatasetInfo] = None

    # Training configuration
    test_size: float = Field(0.25, ge=0, le=0.9)
    random_state: int = Field(2025, ge=0)

    @field_validator('X')
    @classmethod
    def validate_X_shape(cls, v):
        if not v or not v[0]:
            raise ValueError("X cannot be empty")
        n_features = len(v[0])
        for i, row in enumerate(v):
            if len(row) != n_features:
                raise ValueError(
                    f"Row {i} has {len(row)} features, expected {n_features}")
        return v

    @field_validator('y', mode='after')
    @classmethod
    def validate_y_length(cls, v, info):
        if info.data and 'X' in info.data and len(v) != len(info.data['X']):
            raise ValueError(
                f"y length ({len(v)}) must match X length ({len(info.data['X'])})")
        return v

    @field_validator('feature_names', mode='after')
    @classmethod
    def validate_feature_names(cls, v, info):
        if v is not None and info.data and 'X' in info.data and info.data['X']:
            expected_length = len(info.data['X'][0])
            if len(v) != expected_length:
                raise ValueError(
                    f"feature_names length ({len(v)}) must match n_features ({expected_length})")
        return v

    @field_validator('target_names', mode='after')
    @classmethod
    def validate_target_names(cls, v, info):
        if v is not None and info.data and 'y' in info.data:
            unique_targets = set(info.data['y'])
            if len(v) < len(unique_targets):
                raise ValueError(
                    f"target_names must include names for all {len(unique_targets)} classes")
        return v

    def to_numpy(self):
        """Convert to numpy arrays for sklearn."""
        return np.array(self.X), np.array(self.y)

    def get_feature_names(self) -> List[str]:
        """Get feature names, generating defaults if needed."""
        if self.feature_names:
            return self.feature_names
        return [f"feature_{i}" for i in range(len(self.X[0]))]

    def get_target_names(self) -> List[str]:
        """Get target names, generating defaults if needed."""
        if self.target_names:
            return self.target_names
        unique_targets = sorted(set(self.y))
        return [str(target) for target in unique_targets]

    def generate_info(self) -> DatasetInfo:
        """Generate dataset info from data."""
        X_array = np.array(self.X)
        y_array = np.array(self.y)

        return DatasetInfo(
            name=self.info.name if self.info else "Custom Dataset",
            description=self.info.description if self.info else None,
            n_samples=X_array.shape[0],
            n_features=X_array.shape[1],
            n_classes=len(np.unique(y_array)),
            target_type="classification"
        )


class PredefinedDataset(BaseModel):
    """Reference to a predefined (classification) dataset."""
    type: Literal["predefined"] = Field("predefined", description="Discriminator for Union type")
    name: Literal["iris", "wine", "breast_cancer", "digits"]
    test_size: float = Field(0.25, ge=0, le=0.9)
    random_state: int = Field(2025, ge=0)


class RegressionDataset(BaseModel):
    """Complete dataset with features and a continuous numeric target (for regression)."""
    type: Literal["custom_regression"] = Field("custom_regression", description="Discriminator for Union type")
    X: List[List[float]] = Field(..., description="Feature matrix")
    y: List[float] = Field(..., description="Continuous target vector")
    feature_names: Optional[List[str]] = None
    target_name: Optional[str] = "target"
    info: Optional[DatasetInfo] = None

    # Training configuration
    test_size: float = Field(0.25, ge=0, le=0.9)
    random_state: int = Field(2025, ge=0)

    def to_numpy(self):
        """Convert to numpy arrays for sklearn."""
        import numpy as np
        return np.array(self.X), np.array(self.y)

    def get_feature_names(self) -> List[str]:
        """Get feature names, generating defaults if needed."""
        if self.feature_names:
            return self.feature_names
        return [f"feature_{i}" for i in range(len(self.X[0]))]


class PredefinedRegressionDataset(BaseModel):
    """Reference to a predefined regression dataset."""
    type: Literal["predefined_regression"] = Field("predefined_regression", description="Discriminator for Union type")
    name: Literal["diabetes", "california_housing"] = "diabetes"
    test_size: float = Field(0.25, ge=0, le=0.9)
    random_state: int = Field(2025, ge=0)


# Backward-compatibility alias
Dataset = ClassificationDataset
