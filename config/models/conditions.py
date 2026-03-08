from typing import List, Literal, Optional, Any, Annotated, Union
from pydantic import BaseModel, Field

ActionType = Literal["train", "predict", "step", "manual_evaluate", "page_visit", "button_click"]

class BaseCondition(BaseModel):
    condition_type: str
    name: Optional[str] = None
    description: Optional[str] = None

class BypassCheck(BaseCondition):
    condition_type: Literal["Bypass"] = "Bypass"

class SlideCheck(BaseCondition):
    condition_type: Literal["Slide"] = "Slide"
    slide_name: str
    slide_description: Optional[str] = None

class ParameterCheck(BaseCondition):
    condition_type: Literal["Parameter"] = "Parameter"
    category: str
    parameter: str
    comparator: Literal["<", "<=", ">=", ">", "="]
    value: Any

class TimeCheck(BaseCondition):
    condition_type: Literal["Time"] = "Time"
    wait: int

class ButtonPress(BaseCondition):
    condition_type: Literal["Button"] = "Button"
    button_id: str

class Lambda(BaseCondition):
    condition_type: Literal["Lambda"] = "Lambda"
    exec_str: str

# Defined BEFORE Condition, using string forward ref for Condition
class AndCondition(BaseCondition):
    condition_type: Literal["And"] = "And"
    conditions: List["Condition"]

class OrCondition(BaseCondition):
    condition_type: Literal["Or"] = "Or"
    conditions: List["Condition"]

class ActionCountCheck(BaseCondition):
    """Unlocks when the user has performed an action at least `min` times."""
    condition_type: Literal["ActionCount"] = "ActionCount"
    action: ActionType
    min: int

class PageVisitedCheck(BaseCondition):
    """Unlocks when the user has visited a specific page (by local_index)."""
    condition_type: Literal["PageVisited"] = "PageVisited"
    page_id: int

# Condition defined LAST, using actual classes
Condition = Annotated[
    Union[BypassCheck, ParameterCheck, TimeCheck,
          ButtonPress, Lambda, AndCondition, OrCondition, SlideCheck,
          ActionCountCheck, PageVisitedCheck],
    Field(discriminator="condition_type")
]

# Rebuild models to resolve "Condition" string reference
AndCondition.model_rebuild()
OrCondition.model_rebuild()
