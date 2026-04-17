"""Models package - Pydantic models for configuration"""

# Base types
from .base import (
    BasePage,
    DynamicPage,
    DynamicPageAbstract,
    Index,
    ModelComponentType,
    ModelNames,
    ModelPage,
    ProblemType,
    Slide,
    StaticPage,
    StaticParameters,
)

# Dataset
from .dataset import (
    CustomDataset,
    CustomRegressionDataset,
    DatasetEntry,
    DatasetReference,
    PageDataset,
    PredefinedDataset,
    PredefinedRegressionDataset,
)

# Conditions
from .conditions import (
    AndCondition,
    BaseCondition,
    ButtonPress,
    BypassCheck,
    Condition,
    Lambda,
    OrCondition,
    ParameterCheck,
    SlideCheck,
    TimeCheck,
)

# Config and Unions
from .config import (
    Config,
    DynamicPageUnion,
    ModelPageUnion,
    PageUnion,
)

# Decision Tree Pages
from .decision_tree_page import (
    DTreeManualPage,
    DTreeManualParameters,
    DTreePage,
    DTreePageUnion,
    DTreePredictPage,
    DTreePredictParameters,
    DTreeTrainPage,
    DTreeTrainParameters,
)

# KMeans Pages
from .kmeans_page import (
    KMeansPage,
    KMeansPageUnion,
    KMeansPredictPage,
    KMeansTrainPage,
    KMeansTrainParameters,
)

# Linear Regression Pages
from .linear_regression_page import (
    LinearRegressionPage,
    LinearRegressionPageUnion,
    LinearRegressionStepPage,
    LinearRegressionTrainPage,
    LinearRegressionTrainParameters,
    LinearRegressionVizPage,
    LinearRegressionVizParameters,
)

# SVM Pages
from .svm_page import (
    SVMPage,
    SVMPageUnion,
    SVMPredictPage,
    SVMPredictParameters,
    SVMStepPage,
    SVMStepParameters,
    SVMTrainPage,
    SVMTrainParameters,
)

# KNN Pages
from .knn_page import (
    KNNPage,
    KNNPageUnion,
    KNNPredictPage,
    KNNTrainPage,
    KNNVizPage,
    KNNVizParameters,
)

# Story
from .story import (
    Edge,
    EdgeNode,
    Story,
    StoryNode,
)

# Utils
from .utils import (
    compute_object_hash,
    create_page_dict,
)

# Page Registry for UI
model_pages = {
    "Static": StaticPage,
    "Decision Tree: Manual": DTreeManualPage,
    "Decision Tree: Train": DTreeTrainPage,
    "Decision Tree: Predict": DTreePredictPage,
    "KNN: Viz": KNNVizPage,
    "KNN: Train": KNNTrainPage,
    "KNN: Predict": KNNPredictPage,
    "KMeans: Train": KMeansTrainPage,
    "KMeans: Predict": KMeansPredictPage,
    "Linear Regression: Visualise": LinearRegressionVizPage,
    "Linear Regression: Train": LinearRegressionTrainPage,
    "Linear Regression: Step": LinearRegressionStepPage,
    "SVM: Step": SVMStepPage,
    "SVM: Train": SVMTrainPage,
    "SVM: Predict": SVMPredictPage,
}

__all__ = [
    # Base
    "Index",
    "Slide",
    "BasePage",
    "DynamicPageAbstract",
    "DynamicPage",
    "ModelNames",
    "ModelComponentType",
    "ModelPage",
    "ProblemType",
    # Dataset
    "CustomDataset",
    "CustomRegressionDataset",
    "DatasetEntry",
    "DatasetReference",
    "PageDataset",
    "PredefinedDataset",
    "PredefinedRegressionDataset",
    # Conditions
    "BaseCondition",
    "BypassCheck",
    "SlideCheck",
    "ParameterCheck",
    "TimeCheck",
    "ButtonPress",
    "Lambda",
    "AndCondition",
    "OrCondition",
    "Condition",
    # Static
    "StaticParameters",
    "StaticPage",
    # Decision Tree
    "DTreeManualParameters",
    "DTreeTrainParameters",
    "DTreePredictParameters",
    "DTreePage",
    "DTreeManualPage",
    "DTreeTrainPage",
    "DTreePredictPage",
    "DTreePageUnion",
    # KNN
    "KNNVizParameters",
    "KNNPage",
    "KNNVizPage",
    "KNNTrainPage",
    "KNNPredictPageKNNPageUnion",
    # KMeans
    "KMeansTrainParameters",
    "KMeansPage",
    "KMeansTrainPage",
    "KMeansPredictPage",
    "KMeansPageUnion",
    # SVM
    "SVMStepParameters",
    "SVMTrainParameters",
    "SVMPredictParameters",
    "SVMPage",
    "SVMStepPage",
    "SVMTrainPage",
    "SVMPredictPage",
    "SVMPageUnion",
    # Linear Regression
    "LinearRegressionVizParameters",
    "LinearRegressionTrainParameters",
    "LinearRegressionPage",
    "LinearRegressionVizPage",
    "LinearRegressionTrainPage",
    "LinearRegressionStepPage",
    "LinearRegressionPageUnion",
    # Story
    "EdgeNode",
    "Edge",
    "StoryNode",
    "Story",
    # Config and Unions
    "ModelPageUnion",
    "DynamicPageUnion",
    "PageUnion",
    "Config",
    # Utils
    "compute_object_hash",
    "create_page_dict",
    # Registry
    "model_pages",
]
