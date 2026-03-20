from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

from .base import ModelPage, ProblemType


# Parameters
class KMeansTrainParameters(BaseModel):
    """Parameters for training KMeans"""

    model_config = {"extra": "allow"}

    visualisation_features: list[int] = Field(
        default_factory=lambda: [0, 1], description="Feature indices to visualize"
    )
    include_boundary: bool = Field(
        default=True, description="Whether to include decision boundary"
    )
    max_iterations: int = Field(
        default=100, ge=1, le=1000, description="Maximum iterations before stopping"
    )


# Pages
class KMeansPage(ModelPage):
    model_name: Literal["kmeans"] = "kmeans"
    problem_type: ProblemType = "clustering"


class KMeansTrainPage(KMeansPage):
    component_type: Literal["train"] = "train"
    parameters: KMeansTrainParameters = Field(default_factory=KMeansTrainParameters)


class KMeansPredictPage(KMeansPage):
    component_type: Literal["predict"] = "predict"


class KMeansStepPage(KMeansPage):
    component_type: Literal["step"] = "step"
    parameters: KMeansTrainParameters = Field(default_factory=KMeansTrainParameters)


# Union
KMeansPageUnion = Annotated[
    Union[KMeansTrainPage, KMeansPredictPage, KMeansStepPage], Field(discriminator="component_type")
]
