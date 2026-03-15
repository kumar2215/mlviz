from typing import Any, Dict, Optional
from pydantic import BaseModel


class BaseMLRequest(BaseModel):
    dataset: Optional[Dict[str, Any]] = None


class BaseMLResponse(BaseModel):
    success: bool
    model_key: str
    cached: bool
    metadata: Dict[str, Any]


class ClassificationMetricValues(BaseModel):
    confusion_matrix: list[list[int]]
    accuracy: float
    precision: float
    recall: float
    f1: float


class RegressionMetricValues(BaseModel):
    """Metrics for regression model responses."""
    r2: float
    mse: float
    rmse: float
    mae: float


class ClassificationMetrics(BaseModel):
    train: ClassificationMetricValues
    test: Optional[ClassificationMetricValues] = None


class RegressionMetrics(BaseModel):
    """Metrics for regression model responses."""
    train: RegressionMetricValues
    test: Optional[RegressionMetricValues] = None


class ClassificationMetadata(BaseModel):
    """Metadata for classifier responses."""
    feature_names: list[str]
    class_names: list[str]
    n_features: int
    n_classes: int
    dataset_name: Optional[str] = None

