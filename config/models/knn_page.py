from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from .base import ModelPage, ProblemType


# Parameters
class KNNVizParameters(BaseModel):
    """Parameters for KNN visualization"""

    model_config = {"extra": "allow"}

    visualisation_features: list[int] = Field(
        default_factory=lambda: [0, 1], description="Feature indices to visualize"
    )
    include_boundary: bool = Field(
        default=True, description="Whether to include decision boundary"
    )


# Pages
class KNNPage(ModelPage):
    model_name: Literal["knn"] = "knn"
    problem_type: ProblemType = "classifier"


class KNNTrainPage(KNNPage):
    component_type: Literal["train"] = "train"


class KNNVizPage(KNNPage):
    component_type: Literal["viz_only"] = "viz_only"
    parameters: KNNVizParameters = Field(default_factory=KNNVizParameters)


class KNNPredictPage(KNNPage):
    component_type: Literal["predict"] = "predict"


# Union
KNNPageUnion = Annotated[
    Union[KNNTrainPage, KNNVizPage, KNNPredictPage],
    Field(discriminator="component_type"),
]
