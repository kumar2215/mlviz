from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

from .base import ModelPage, ProblemType


# Parameters
class DTreeManualParameters(BaseModel):
    """Parameters for manual decision tree building"""

    model_config = {"extra": "allow"}


class DTreeTrainParameters(BaseModel):
    """Parameters for training a decision tree"""

    model_config = {"extra": "allow"}


class DTreePredictParameters(BaseModel):
    """Parameters for decision tree prediction"""

    model_config = {"extra": "allow"}


# Pages
class DTreePage(ModelPage):
    model_name: Literal["decision_tree"] = "decision_tree"
    problem_type: ProblemType = "classifier"


class DTreeManualPage(DTreePage):
    component_type: Literal["manual"] = "manual"
    parameters: DTreeManualParameters = Field(default_factory=DTreeManualParameters)


class DTreeTrainPage(DTreePage):
    component_type: Literal["train"] = "train"
    parameters: DTreeTrainParameters = Field(default_factory=DTreeTrainParameters)


class DTreePredictPage(DTreePage):
    component_type: Literal["predict"] = "predict"
    parameters: DTreePredictParameters = Field(default_factory=DTreePredictParameters)


# Union
DTreePageUnion = Annotated[
    Union[DTreeManualPage, DTreeTrainPage, DTreePredictPage],
    Field(discriminator="component_type"),
]
