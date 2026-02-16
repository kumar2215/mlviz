from typing import Literal, Optional, TypedDict

from pydantic import BaseModel, Field

from .dataset import PageDataset

# Type definitions
Index = str
ModelNames = Literal["decision_tree", "knn", "kmeans"]
ModelComponentType = Literal["manual", "train", "predict", "viz_only"]
ProblemType = Literal["classifier", "clustering", "regression"]


class Slide(BaseModel):
    slide_name: str
    slide_description: Optional[str] = None


class BasePage(BaseModel):
    name: Optional[str] = None
    page_type: Literal["static", "dynamic"]
    note: Optional[str] = Field(None, description="Optional note or annotation for this page")
    # Parameters are defined in subclasses


class DynamicPageAbstract(BasePage):
    page_type: Literal["dynamic"] = "dynamic"
    dynamic_type: Literal["model", "none"]


class DynamicPage(DynamicPageAbstract):
    dynamic_type: Literal["none"] = "none"


class ModelPage(DynamicPageAbstract):
    dynamic_type: Literal["model"] = "model"
    model_name: ModelNames
    component_type: ModelComponentType
    problem_type: ProblemType
    dataset: Optional[PageDataset] = Field(
        None, description="Dataset for this page (reference or predefined)"
    )

    def model_dump(self, **kwargs):
        d = super().model_dump(**kwargs)
        if "dataset" in d and d["dataset"] is None:
            del d["dataset"]
        return d


class StaticParameters(BaseModel):
    text: Optional[str] = Field(None, description="Text content for the page")
    link: Optional[str] = Field(None, description="Optional link URL")


class StaticPage(BasePage):
    page_type: Literal["static"] = "static"
    parameters: StaticParameters = Field(default_factory=StaticParameters)
