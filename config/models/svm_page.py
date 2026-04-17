"""SVM page configuration models."""
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from .base import ModelPage, ProblemType


# ---- Parameters ----

class SVMStepParameters(BaseModel):
    """Parameters for the step-by-step SVM training page."""

    model_config = {"extra": "allow"}

    visualisation_features: list[int] = Field(
        default_factory=lambda: [0, 1],
        description="Feature indices to visualise (must be exactly 2)",
    )


class SVMTrainParameters(BaseModel):
    """Parameters for the SVM training page."""

    model_config = {"extra": "allow"}

    visualisation_features: list[int] = Field(
        default_factory=lambda: [0, 1],
        description="Feature indices to visualise (must be exactly 2)",
    )


class SVMPredictParameters(BaseModel):
    """Parameters for the SVM prediction page."""

    model_config = {"extra": "allow"}

    visualisation_features: list[int] = Field(
        default_factory=lambda: [0, 1],
        description="Feature indices to visualise (must be exactly 2)",
    )


# ---- Pages ----

class SVMPage(ModelPage):
    model_name: Literal["svm"] = "svm"
    problem_type: ProblemType = "classifier"


class SVMStepPage(SVMPage):
    """Step-by-step subgradient descent page — user steps through SVM training."""

    component_type: Literal["step"] = "step"
    parameters: SVMStepParameters = Field(default_factory=SVMStepParameters)


class SVMTrainPage(SVMPage):
    """SVM training page — fits the optimal hyperplane and shows support vectors."""

    component_type: Literal["train"] = "train"
    parameters: SVMTrainParameters = Field(default_factory=SVMTrainParameters)


class SVMPredictPage(SVMPage):
    """SVM prediction page — classify new points using a trained SVM."""

    component_type: Literal["predict"] = "predict"
    parameters: SVMPredictParameters = Field(default_factory=SVMPredictParameters)


# ---- Union ----

SVMPageUnion = Annotated[
    Union[SVMStepPage, SVMTrainPage, SVMPredictPage],
    Field(discriminator="component_type"),
]
