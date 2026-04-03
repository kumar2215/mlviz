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
        description="Regularization parameter for soft margin"
    )
    margin_type: str = Field(
        "soft",
        description="Type of SVM margin: 'hard' or 'soft'"
    )
    max_iterations: int = Field(
        500, ge=1, le=2000,
        description="Max SMO epochs; at most 15 frames are stored for playback"
    )

    def typeof_kernel(self) -> str:
        return "linear"


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
