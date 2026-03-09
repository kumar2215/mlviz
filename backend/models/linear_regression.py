from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class LinearRegressionParameters(BaseModel):
    """Parameters for Simple Linear Regression."""

    feature_x: int = Field(
        0, ge=0, le=20,
        description="Index of the feature to use as the predictor (x-axis)"
    )
    fit_intercept: bool = Field(
        True,
        description="Whether to include an intercept (bias) term in the model"
    )
    test_size: float = Field(
        0.2, ge=0.05, le=0.5,
        description="Proportion of data to hold out as the test set"
    )
    random_state: int = Field(
        42, ge=0,
        description="Random seed for reproducibility of the train/test split"
    )
    learning_rate: float = Field(
        0.01, ge=1e-6, le=10.0,
        description="Step size for each gradient descent iteration"
    )

    def to_sklearn_params(self) -> Dict[str, Any]:
        """Return only the parameters that sklearn LinearRegression accepts."""
        return {"fit_intercept": self.fit_intercept}


class RegressionMetadata(BaseModel):
    """Metadata for regression model responses."""

    feature_names: list[str]
    n_features: int
    n_samples: int
    target_name: str
    dataset_name: Optional[str] = None
    feature_x_index: int
    feature_x_name: str
