from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class SVMParameters(BaseModel):
    """Parameters for Support Vector Machine Classification."""

    feature_x: int = Field(
        0, ge=0, le=20,
        description="Index of first feature to use as predictor (x-axis)"
    )
    feature_y: int = Field(
        1, ge=0, le=20,
        description="Index of second feature to use as predictor (y-axis)"
    )
    C: float = Field(
        1.0, ge=1e-5,
        description="Regularization parameter"
    )
    kernel: str = Field(
        "linear",
        description="Kernel type to be used"
    )
    gamma: Optional[float] = Field(
        None,
        description="Kernel coefficient for 'rbf', 'poly'"
    )
    degree: int = Field(
        3, ge=1,
        description="Degree of polynomial kernel function"
    )
    max_iterations: int = Field(
        500, ge=1, le=2000,
        description="Max SMO epochs; at most 15 frames are stored for playback"
    )

    def to_sklearn_params(self) -> Dict[str, Any]:
        """Return parameters configured for sklearn SVC."""
        params = {
            "C": self.C,
            "kernel": self.kernel,
        }
        if self.kernel in ["rbf", "poly", "sigmoid"]:
            if self.gamma is not None:
                params["gamma"] = self.gamma
            else:
                params["gamma"] = "scale"
        if self.kernel == "poly":
            params["degree"] = self.degree
        return params

class SVMMetadata(BaseModel):
    """Metadata for SVM model responses."""

    feature_names: List[str]
    n_features: int
    n_samples: int
    target_name: str
    dataset_name: Optional[str] = None
    feature_x_index: int
    feature_x_name: str
    feature_y_index: int
    feature_y_name: str
    class_names: List[str]
    kernel: str = Field("linear", description="Kernel used for training")
