from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from models import (
    ClassificationMetadata,
    ClassificationMetrics,
    ClassificationDataset,
    DatasetInfo,
    DecisionBoundaryData,
    DecisionTreeParameters,
    HistogramData,
    KMeansParameters,
    KNNParameters,
    LinearRegressionParameters,
    ManualFeatureStatsParameters,
    NeighborInfo,
    NodeStatistics,
    NodeStatParameters,
    PredefinedClassificationDataset,
    PredefinedRegressionDataset,
    RegressionDataset,
    RegressionMetadata,
    RegressionMetrics,
    SplitStatistics,
    ThresholdStatistics,
    TreeNode,
)
from pydantic import BaseModel, Discriminator, Field

# Create a discriminated union type for Classification ClassificationDataset
DatasetUnion = Annotated[Union[ClassificationDataset, PredefinedClassificationDataset], Field(discriminator="type")]

# Create a discriminated union type for Regression ClassificationDataset
RegressionDatasetUnion = Annotated[
    Union[RegressionDataset, PredefinedRegressionDataset],
    Field(discriminator="type"),
]


class DecisionTreeTrainingRequest(DecisionTreeParameters):
    """Request model for Decision Tree."""

    dataset: Optional[DatasetUnion] = Field(
        None, description="ClassificationDataset to use for training"
    )


class DecisionTreeTrainingResponse(BaseModel):
    """Response model for Decision Tree."""

    success: bool
    model_key: str
    cached: bool
    metadata: ClassificationMetadata
    tree: TreeNode
    metrics: ClassificationMetrics


class DecisionTreePredictionRequest(BaseModel):
    """Request model for making predictions."""

    model_params: DecisionTreeTrainingRequest
    input_data: list[list[float]]


class DecisionTreePredictionResponse(BaseModel):
    """Response model for predictions."""

    predictions: list[str]
    prediction_indices: list[int]


# Manual Decision Tree Builder Models


class ManualNodeStatsRequest(NodeStatParameters):
    """Request to calculate statistics for a potential node split."""

    dataset: Optional[DatasetUnion] = Field(
        None, description="ClassificationDataset to use for training"
    )


class ManualNodeStatsResponse(BaseModel):
    """Response containing statistics for a potential split."""

    feature: str
    feature_index: int
    threshold: float
    split_stats: SplitStatistics
    histogram_data: HistogramData
    left_samples_mask: List[int] = Field(
        description="Indices of samples that go to left child (<= threshold)"
    )
    right_samples_mask: List[int] = Field(
        description="Indices of samples that go to right child (> threshold)"
    )
    available_features: List[str] = Field(description="List of all available features")
    class_names: List[str] = Field(description="List of all class names in the dataset")


class ManualFeatureStatsRequest(ManualFeatureStatsParameters):
    """Request to calculate statistics for all thresholds of a feature."""

    dataset: Optional[DatasetUnion] = Field(
        None, description="ClassificationDataset to use for training"
    )


class ManualFeatureStatsResponse(BaseModel):
    """Response containing statistics for all thresholds of a feature."""

    feature: str
    feature_index: int
    thresholds: list[ThresholdStatistics] = Field(
        description="Statistics for each threshold, sorted by threshold value"
    )
    best_threshold: float = Field(description="Threshold with highest information gain")
    best_threshold_index: int = Field(
        description="Index of best threshold in the thresholds array"
    )
    feature_range: List[float] = Field(description="[min, max] values of the feature")
    histogram_data: HistogramData = Field(
        description="Overall feature distribution at current node"
    )
    total_unique_values: int = Field(
        description="Total number of unique feature values"
    )
    returned_threshold_count: int = Field(
        description="Number of thresholds returned (may be capped)"
    )
    available_features: List[str] = Field(description="List of all available features")
    class_names: List[str] = Field(description="List of all class names in the dataset")


class ManualTreeEvaluateRequest(BaseModel):
    """Request to evaluate a manually built tree."""

    tree: TreeNode = Field(description="Root node of the manual tree")
    dataset: Optional[DatasetUnion] = Field(
        None, description="ClassificationDataset to use for evaluation (defaults to Iris)"
    )


class ManualTreeEvaluateResponse(BaseModel):
    """Response containing evaluation metrics for a manual tree."""

    metrics: ClassificationMetrics = Field(
        description="Classification metrics including confusion matrix and scores"
    )
    metadata: ClassificationMetadata = Field(
        description="Classifier metadata including feature and class information"
    )


class DecisionTreeTraversalPredictRequest(BaseModel):
    """Request for decision tree prediction with traversal instructions."""

    tree: TreeNode = Field(description="Root node of the decision tree")
    points: Dict[str, float] = Field(
        description="Feature name to value mapping for prediction"
    )
    class_names: Optional[List[str]] = Field(
        None, description="Class names for the prediction result (optional)"
    )


class DecisionTreeTraversalPredictResponse(BaseModel):
    """Response containing prediction result with traversal instructions."""

    predicted_class: str = Field(description="Predicted class label")
    predicted_class_index: int = Field(description="Index of the predicted class")
    confidence: float = Field(
        description="Confidence score (proportion of samples at leaf)"
    )
    instructions: List[Literal["left", "right", "stop"]] = Field(
        description="Traversal instructions from root to leaf"
    )


class BaseParameterInfo(BaseModel):
    """Base parameter information."""

    name: str
    description: str
    default: Any


class SelectParameterInfo(BaseParameterInfo):
    """Select parameter with predefined options."""

    type: Literal["select"]
    options: Union[
        list[Any], str
    ]  # Allow string for dynamic options like "dynamic:features"


class IntParameterInfo(BaseParameterInfo):
    """Integer parameter with optional range."""

    type: Literal["int"]
    min: Optional[int] = None
    max: Optional[int] = None


class NumberParameterInfo(BaseParameterInfo):
    """Number parameter with optional range and step."""

    type: Literal["number"]
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None


class FloatParameterInfo(BaseParameterInfo):
    """Float parameter with optional range and step."""

    type: Literal["float"]
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None


class AnyParameterInfo(BaseParameterInfo):
    """Any type parameter."""

    type: Literal["any"]


ParameterInfo = Annotated[
    Union[
        SelectParameterInfo,
        IntParameterInfo,
        NumberParameterInfo,
        FloatParameterInfo,
        AnyParameterInfo,
    ],
    Field(discriminator="type"),
]


class DatasetListResponse(BaseModel):
    """Response model for available datasets."""

    datasets: Dict[str, DatasetInfo]


class DatasetResponse(BaseModel):
    """Response model for loaded dataset."""

    success: bool
    X: List[List[float]] = Field(description="Feature matrix")
    y: List[int] = Field(description="Target vector")
    feature_names: List[str] = Field(description="Names of features")
    target_names: List[str] = Field(description="Names of target classes")
    info: DatasetInfo = Field(description="ClassificationDataset metadata")
    test_size: float = Field(description="Test set proportion")
    random_state: int = Field(description="Random seed for reproducibility")


class CacheInfoResponse(BaseModel):
    """Response model for cache information."""

    enabled: bool
    current_size: int
    max_size: int
    keys: Union[List[str], str]


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str
    module: str
    cache_info: CacheInfoResponse


class KNNVisualisationRequest(BaseModel):
    """Request model for KNN visualisation without prediction."""

    parameters: KNNParameters = Field(
        default_factory=KNNParameters, description="KNN algorithm parameters"
    )
    dataset: Optional[DatasetUnion] = Field(
        None, description="Training dataset. Defaults to Iris dataset."
    )
    visualisation_features: Optional[List[int]] = Field(
        None, description="Feature indices to visualise (1-3 features)"
    )
    include_boundary: bool = Field(
        True, description="Whether to include decision boundary"
    )
    boundary_resolution: int = Field(
        50, ge=10, le=200, description="Resolution of boundary mesh"
    )


class KNNVisualisationResponse(BaseModel):
    """Response model for KNN visualisation without prediction."""

    success: bool

    # Training data
    training_points: list[list[float]] = Field(
        description="All training point coordinates (visualisation features only)"
    )
    training_labels: list[str] = Field(description="All training point labels")

    # Distance information for interactive exploration
    distance_matrix: list[list[float]] = Field(
        description="Distance from each training point to all other training points (0 for self)"
    )
    neighbor_indices: list[list[int]] = Field(
        description="Indices of K nearest neighbors for each training point (sorted by distance)"
    )

    # Decision boundary data (optional)
    decision_boundary: Optional[DecisionBoundaryData] = Field(
        None, description="Decision boundary visualisation data"
    )

    # Metadata
    metadata: ClassificationMetadata = Field(description="Classifier metadata")

    # Visualisation-specific info
    visualisation_feature_indices: Optional[list[int]] = Field(
        None, description="Feature indices used for visualisation"
    )
    visualisation_feature_names: Optional[list[str]] = Field(
        None, description="Names of features used for visualisation"
    )


class KNNTrainingRequest(BaseModel):
    """Request model for KNN training with evaluation."""

    parameters: KNNParameters = Field(
        default_factory=KNNParameters, description="KNN algorithm parameters"
    )
    dataset: Optional[DatasetUnion] = Field(
        None, description="Training dataset. Defaults to Iris dataset."
    )
    visualisation_features: Optional[List[int]] = Field(
        None, description="Feature indices to visualise (1-3 features)"
    )
    include_boundary: bool = Field(
        True, description="Whether to include decision boundary"
    )
    boundary_resolution: int = Field(
        50, ge=10, le=200, description="Resolution of boundary mesh"
    )


class KNNTrainingResponse(BaseModel):
    """Response model for KNN training with evaluation metrics."""

    success: bool

    # Visualization data (same as KNNVisualisationResponse)
    training_points: list[list[float]]
    training_labels: list[str]
    distance_matrix: list[list[float]]
    neighbor_indices: list[list[int]]
    decision_boundary: Optional[DecisionBoundaryData]

    # Metadata
    metadata: ClassificationMetadata = Field(description="Classifier metadata")

    # Visualisation-specific info
    visualisation_feature_indices: Optional[list[int]]
    visualisation_feature_names: Optional[list[str]]

    # Evaluation metrics (matching DecisionTree)
    metrics: ClassificationMetrics = Field(
        description="Classification metrics including confusion matrix and scores"
    )


class KNNPredictionRequest(BaseModel):
    """Request model for KNN prediction."""

    parameters: KNNParameters = Field(
        default_factory=KNNParameters,
        description="KNN algorithm parameters (defaults to n_neighbors=5, uniform weights, etc.)",
    )
    dataset: Optional[DatasetUnion] = Field(
        None,
        description="Training dataset with X, y, feature_names, class_names. Defaults to Iris dataset.",
    )
    query_points: List[List[float]] = Field(description="Test points to classify")
    visualisation_features: Optional[List[int]] = Field(
        None, description="Indices for visualisation features"
    )
    include_boundary: bool = Field(
        True, description="Whether to include decision boundary data"
    )
    boundary_resolution: int = Field(
        50, ge=10, le=200, description="Resolution of boundary mesh"
    )


class KNNPredictionResponse(BaseModel):
    """Response model for KNN prediction."""

    success: bool
    predictions: list[str] = Field(description="Predicted class labels")
    prediction_indices: list[int] = Field(description="Predicted class indices")

    # Per-query point neighbor information
    neighbors_info: list[list[NeighborInfo]] = Field(
        description="Neighbor information for each query point"
    )

    # All training points information
    training_points: list[list[float]] = Field(
        description="All training point coordinates"
    )
    training_labels: list[str] = Field(description="All training point labels")

    # All distances from query point to training points (for visualization)
    all_distances: list[list[float]] = Field(
        description="Distance from each query point to all training points"
    )

    # Distance information for training points (for interactive exploration)
    distance_matrix: list[list[float]] = Field(
        description="Distance from each training point to all other training points (0 for self)"
    )
    neighbor_indices: list[list[int]] = Field(
        description="Indices of K nearest neighbors for each training point (sorted by distance)"
    )

    # Decision boundary data (optional)
    decision_boundary: Optional[DecisionBoundaryData] = Field(
        None, description="Decision boundary visualization data"
    )

    # Metadata
    feature_names: List[str]
    class_names: List[str]
    n_dimensions: int


# K-Means Models


class KMeansClusterInfo(BaseModel):
    """Information about a single cluster."""

    cluster_id: int
    centroid: List[float]
    n_points: int
    point_indices: List[int]


class KMeansMetadata(BaseModel):
    """Metadata for K-Means clustering."""

    feature_names: List[str]
    n_features: int
    n_samples: int
    n_clusters: int


class KMeansStepResponse(BaseModel):
    """Response model for a single K-Means iteration."""

    success: bool

    # Data points
    data_points: List[List[float]] = Field(
        description="All data points in visualization space"
    )

    # Cluster assignments
    assignments: List[int] = Field(description="Cluster index for each data point")

    # Distance information
    distance_matrix: List[List[float]] = Field(
        description="Distance from each point to each centroid"
    )

    # Centroids
    centroids: List[List[float]] = Field(description="Original centroids passed in")
    new_centroids: List[List[float]] = Field(
        description="Updated centroids after iteration"
    )
    centroid_shifts: List[float] = Field(description="Distance each centroid moved")

    # Convergence
    converged: bool = Field(description="Whether the algorithm has converged")

    # Cluster info
    cluster_info: List[KMeansClusterInfo] = Field(
        description="Detailed information for each cluster"
    )

    # Metadata
    metadata: KMeansMetadata

    # Visualization info
    visualisation_feature_indices: List[int]
    visualisation_feature_names: List[str]

    # Decision boundary data (optional)
    decision_boundary: Optional[DecisionBoundaryData] = Field(
        None, description="Decision boundary visualization data"
    )


class KMeansIterationData(BaseModel):
    """Data for a single K-Means iteration."""

    iteration: int = Field(description="Iteration number (0-indexed)")
    assignments: List[int] = Field(description="Cluster index for each data point")
    distance_matrix: List[List[float]] = Field(
        description="Distance from each point to each centroid"
    )
    centroids: List[List[float]] = Field(description="Centroids at start of iteration")
    new_centroids: List[List[float]] = Field(
        description="Updated centroids after iteration"
    )
    centroid_shifts: List[float] = Field(description="Distance each centroid moved")
    converged: bool = Field(description="Whether converged at this iteration")
    cluster_info: List[KMeansClusterInfo] = Field(
        description="Detailed information for each cluster"
    )


class KMeansTrainRequest(BaseModel):
    """Request model for K-Means training (all iterations)."""

    parameters: KMeansParameters = Field(
        default_factory=KMeansParameters, description="K-Means algorithm parameters"
    )
    centroids: Optional[List[List[float]]] = Field(
        None,
        description="Initial centroid positions [[x, y], ...]. If not provided or empty, will initialize with one random centroid.",
    )
    dataset: Optional[DatasetUnion] = Field(
        None, description="ClassificationDataset to use. Defaults to Iris dataset."
    )
    visualisation_features: Optional[List[int]] = Field(
        None,
        description="Feature indices for visualization (defaults to [feature_1, feature_2])",
    )
    max_iterations: int = Field(
        100, ge=1, le=1000, description="Maximum iterations before stopping"
    )
    include_boundary: bool = Field(
        True, description="Whether to include decision boundary"
    )
    boundary_resolution: int = Field(
        50, ge=10, le=200, description="Resolution of boundary mesh"
    )


class KMeansTrainResponse(BaseModel):
    """Response model for K-Means training (all iterations until convergence)."""

    success: bool

    # Data points
    data_points: List[List[float]] = Field(
        description="All data points in visualization space"
    )

    # All iterations
    iterations: List[KMeansIterationData] = Field(description="Data for each iteration")
    total_iterations: int = Field(description="Total number of iterations run")

    # Final results
    converged: bool = Field(description="Whether the algorithm converged")
    final_centroids: List[List[float]] = Field(description="Final centroid positions")
    final_assignments: List[int] = Field(description="Final cluster assignments")

    # Metadata
    metadata: KMeansMetadata

    # Visualization info
    visualisation_feature_indices: List[int]
    visualisation_feature_names: List[str]

    # Decision boundary data (optional)
    decision_boundary: Optional[DecisionBoundaryData] = Field(
        None, description="Decision boundary visualization data"
    )


class KMeansStepRequest(BaseModel):
    """Request model for a single K-Means iteration."""

    parameters: KMeansParameters = Field(
        default_factory=KMeansParameters, description="K-Means algorithm parameters"
    )
    centroids: Optional[List[List[float]]] = Field(
        None,
        description="Current centroid positions [[x, y], ...]. If not provided or empty, will initialize with one random centroid.",
    )
    dataset: Optional[DatasetUnion] = Field(
        None, description="ClassificationDataset to use. Defaults to Iris dataset."
    )
    visualisation_features: Optional[List[int]] = Field(
        None,
        description="Feature indices for visualization (defaults to [feature_1, feature_2])",
    )
    include_boundary: bool = Field(
        True, description="Whether to include decision boundary"
    )
    boundary_resolution: int = Field(
        50, ge=10, le=200, description="Resolution of boundary mesh"
    )


class KMeansPredictRequest(BaseModel):
    """Request model for K-Means prediction."""

    parameters: KMeansParameters = Field(
        default_factory=KMeansParameters, description="K-Means algorithm parameters"
    )
    centroids: List[List[float]] = Field(description="Centroid positions [[x, y], ...]")
    query_points: List[List[float]] = Field(
        description="Points to assign to clusters [[x, y], ...]"
    )


class KMeansPredictResponse(BaseModel):
    """Response model for K-Means prediction."""

    success: bool

    # Query points
    query_points: List[List[float]] = Field(description="The input points")

    # Assignments
    assignments: List[int] = Field(description="Cluster index for each query point")

    # Distance information
    distance_matrix: List[List[float]] = Field(
        description="Distance from each query point to each centroid"
    )
    assigned_distances: List[float] = Field(
        description="Distance to the assigned centroid for each point"
    )

    # Centroids
    centroids: List[List[float]] = Field(description="The centroids used")


# ---------------------------------------------------------------------------
# Linear Regression Models
# ---------------------------------------------------------------------------


class LinearRegressionVisualisationRequest(BaseModel):
    """Request model for linear regression scatter visualisation."""

    parameters: LinearRegressionParameters = Field(
        default_factory=LinearRegressionParameters,
        description="Linear regression parameters",
    )
    dataset: Optional[RegressionDatasetUnion] = Field(
        None,
        description="Regression dataset. Defaults to sklearn diabetes.",
    )


class LinearRegressionVisualisationResponse(BaseModel):
    """Response model for linear regression scatter visualisation."""

    success: bool
    points: List[List[float]] = Field(
        description="Scatter points as [[x, y], ...] using the chosen feature vs target"
    )
    x_range: List[float] = Field(
        description="[min, max] range for the x-axis (with margin)"
    )
    y_range: List[float] = Field(
        description="[min, max] range for the y-axis (with margin)"
    )
    metadata: RegressionMetadata


class LinearRegressionTrainRequest(BaseModel):
    """Request model for linear regression OLS training."""

    parameters: LinearRegressionParameters = Field(
        default_factory=LinearRegressionParameters,
        description="Linear regression parameters",
    )
    dataset: Optional[RegressionDatasetUnion] = Field(
        None,
        description="Regression dataset. Defaults to sklearn diabetes.",
    )


class LinearRegressionTrainResponse(BaseModel):
    """Response model for linear regression OLS training."""

    success: bool
    points: List[List[float]] = Field(
        description="All scatter points [[x, y], ...] for display"
    )
    x_range: List[float] = Field(
        description="[min, max] range for the x-axis (with margin)"
    )
    y_range: List[float] = Field(
        description="[min, max] range for the y-axis (with margin)"
    )
    line: Dict[str, float] = Field(description="Optimal OLS line: { slope, intercept }")
    metrics: RegressionMetrics = Field(
        description="Regression metrics on the training set"
    )
    metadata: RegressionMetadata


class LinearRegressionStepRequest(BaseModel):
    """Request model for a single gradient descent step."""

    slope: float = Field(description="Current slope of the line")
    intercept: float = Field(description="Current intercept of the line")
    learning_rate: float = Field(
        0.01, gt=0, description="Step size for gradient descent"
    )
    points: List[List[float]] = Field(
        description="Data points [[x, y], ...] to compute gradients on"
    )
    fit_intercept: bool = Field(
        True, description="Whether the intercept should be updated"
    )


class LinearRegressionEvaluateRequest(BaseModel):
    """Request model for evaluating an arbitrary line."""

    slope: float = Field(description="Slope of the line to evaluate")
    intercept: float = Field(description="Intercept of the line to evaluate")
    points: List[List[float]] = Field(
        description="Data points [[x, y], ...] to evaluate on"
    )


class LinearRegressionEvaluateResponse(BaseModel):
    """Response model for line evaluation."""

    success: bool
    metrics: RegressionMetrics = Field(description="Regression metrics for the line")


class LinearRegressionStepResponse(BaseModel):
    """Response model for a single gradient descent step."""

    success: bool

    # Current state
    slope: float = Field(description="Current slope (before update)")
    intercept: float = Field(description="Current intercept (before update)")
    metrics_before: RegressionMetrics = Field(
        description="Regression metrics for the current line"
    )

    # Proposed new state
    new_slope: float = Field(
        description="Proposed slope after one gradient descent step"
    )
    new_intercept: float = Field(
        description="Proposed intercept after one gradient descent step"
    )
    metrics_after: RegressionMetrics = Field(
        description="Regression metrics for the proposed new line"
    )

    # Gradient information (for display)
    grad_slope: float = Field(description="Gradient of loss w.r.t. slope")
    grad_intercept: float = Field(description="Gradient of loss w.r.t. intercept")
    loss_before: float = Field(description="MSE loss before the update")
    loss_after: float = Field(description="MSE loss after the proposed update")
