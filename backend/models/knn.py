from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field


class KNNParameters(BaseModel):
    """Core KNN algorithm parameters matching sklearn.neighbors.KNeighborsClassifier."""

    n_neighbors: int = Field(
        5, ge=1, le=50, description="Number of neighbors to use"
    )
    weights: Literal["uniform", "distance"] = Field(
        "uniform",
        description="Weight function: 'uniform' (equal weights) or 'distance' (inverse distance weighting)"
    )
    algorithm: Literal["auto", "ball_tree", "kd_tree", "brute"] = Field(
        "auto",
        description="Algorithm to compute nearest neighbors"
    )
    leaf_size: int = Field(
        30, ge=1, le=100,
        description="Leaf size passed to BallTree or KDTree (affects speed and memory)"
    )
    p: float = Field(
        2, ge=1,
        description="Power parameter for Minkowski metric (p=1: Manhattan, p=2: Euclidean)"
    )
    metric: Literal["minkowski", "euclidean", "manhattan", "chebyshev"] = Field(
        "minkowski",
        description="Distance metric to use"
    )
    
    # Feature selection parameters (not passed to sklearn)
    feature_1: int = Field(
        0, ge=0, le=10,
        description="First feature index for training and visualization"
    )
    feature_2: Optional[int] = Field(
        1, ge=0, le=10,
        description="Second feature index for training and visualization (optional)"
    )

    def to_sklearn_params(self) -> Dict[str, Any]:
        """Convert to sklearn KNeighborsClassifier parameters.
        
        Excludes feature_1 and feature_2 as they're not sklearn parameters.
        """
        params = self.model_dump()
        # Remove feature selection params (not sklearn params)
        params.pop('feature_1', None)
        params.pop('feature_2', None)
        return params


class NeighborInfo(BaseModel):
    """Information about a single neighbor."""
    index: int = Field(description="Index in training data")
    distance: float = Field(description="Distance from query point")
    label: str = Field(description="Class label")
    coordinates: List[float] = Field(description="Feature values")


from .base import DecisionBoundaryData



class KNNPredictionRequest(BaseModel):
    """Request model for KNN prediction."""
    query_points: List[List[float]] = Field(
        description="Test points to classify"
    )
    parameters: KNNParameters = Field(
        default_factory=KNNParameters,
        description="KNN algorithm parameters (defaults to n_neighbors=5, uniform weights, etc.)"
    )
    dataset: Optional[Dict[str, Any]] = Field(
        None,
        description="Training dataset with X, y, feature_names, class_names. Defaults to Iris dataset."
    )
    visualisation_features: Optional[List[int]] = Field(
        None,
        description="Feature indices to use for visualization (1-3 features). If None, uses first 3 features for >3D data, or all features for <=3D. Example: [0, 2] to visualize only features 0 and 2."
    )
    include_boundary: bool = Field(
        True, description="Whether to include decision boundary data (automatically disabled for >3D unless visualization_features specified)"
    )
    boundary_resolution: int = Field(
        50, ge=10, le=200, description="Resolution of boundary mesh"
    )


class KNNPredictionResponse(BaseModel):
    """Response model for KNN prediction."""
    success: bool
    predictions: List[str] = Field(description="Predicted class labels")
    prediction_indices: List[int] = Field(
        description="Predicted class indices")

    # Per-query point neighbor information
    neighbors_info: List[List[NeighborInfo]] = Field(
        description="Neighbor information for each query point"
    )

    # All training points information
    training_points: List[List[float]] = Field(
        description="All training point coordinates"
    )
    training_labels: List[str] = Field(
        description="All training point labels"
    )

    # All distances from query point to training points (for visualization)
    all_distances: List[List[float]] = Field(
        description="Distance from each query point to all training points"
    )

    # Decision boundary data (optional)
    decision_boundary: Optional[DecisionBoundaryData] = Field(
        None, description="Decision boundary visualization data"
    )

    # Metadata
    feature_names: List[str]
    class_names: List[str]
    n_dimensions: int
    visualisation_feature_indices: Optional[List[int]] = Field(
        None, description="Feature indices used for visualization (subset of all features)"
    )
    visualisation_feature_names: Optional[List[str]] = Field(
        None, description="Names of features used for visualization"
    )
