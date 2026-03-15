"""Linear Regression page configuration models."""
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from .base import ModelPage, ProblemType


# ---- Parameters ----

class LinearRegressionVizParameters(BaseModel):
    """Parameters for the scatter-only visualise page (no fitting)."""

    model_config = {"extra": "allow"}

    feature_x: int = Field(
        default=0,
        ge=0,
        description="Index of the predictor feature to display on the x-axis",
    )


class LinearRegressionTrainParameters(BaseModel):
    """Parameters for the OLS training page."""

    model_config = {"extra": "allow"}

    feature_x: int = Field(
        default=0,
        ge=0,
        description="Index of the predictor feature to use",
    )
    fit_intercept: bool = Field(
        default=True,
        description="Whether to fit an intercept (bias) term",
    )
    test_size: float = Field(
        default=0.2,
        ge=0.05,
        le=0.5,
        description="Proportion of data held out as the test set",
    )
    random_state: int = Field(
        default=42,
        ge=0,
        description="Random seed for reproducibility",
    )
    learning_rate: float = Field(
        default=0.01,
        gt=0,
        le=1.0,
        description="Step size for gradient descent (used by the step page)",
    )


# ---- Pages ----

class LinearRegressionPage(ModelPage):
    model_name: Literal["linear"] = "linear"
    problem_type: ProblemType = "regression"


class LinearRegressionVizPage(LinearRegressionPage):
    """Scatter-only visualise page — user manually controls the line."""

    component_type: Literal["predict"] = "predict"
    parameters: LinearRegressionVizParameters = Field(
        default_factory=LinearRegressionVizParameters
    )


class LinearRegressionTrainPage(LinearRegressionPage):
    """OLS training page — fits the optimal line and shows train/test metrics."""

    component_type: Literal["train"] = "train"
    parameters: LinearRegressionTrainParameters = Field(
        default_factory=LinearRegressionTrainParameters
    )


class LinearRegressionStepPage(LinearRegressionPage):
    """Step-by-step gradient descent page — user accepts/rejects each update."""

    component_type: Literal["step"] = "step"
    parameters: LinearRegressionTrainParameters = Field(
        default_factory=LinearRegressionTrainParameters
    )


# ---- Union ----

LinearRegressionPageUnion = Annotated[
    Union[
        LinearRegressionVizPage,
        LinearRegressionTrainPage,
        LinearRegressionStepPage,
    ],
    Field(discriminator="component_type"),
]
