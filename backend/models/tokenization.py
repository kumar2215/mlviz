from typing import Literal

from pydantic import BaseModel, Field


class PredefinedRegexDataset(BaseModel):
    type: Literal["predefined_regex"] = "predefined_regex"
    name: Literal["punctuation"]


class PredefinedPorterDataset(BaseModel):
    type: Literal["predefined_porter"] = "predefined_porter"
    name: Literal["suffixes"]


class RegexOption(BaseModel):
    id: str
    label: str
    pattern: str


class RegexMatch(BaseModel):
    text: str
    start: int
    end: int


class RegexStateRequest(BaseModel):
    dataset: PredefinedRegexDataset


class RegexStateResponse(BaseModel):
    text: str
    options: list[RegexOption]


class RegexChoiceRequest(RegexStateRequest):
    option_id: str = Field(min_length=1, max_length=64)


class RegexPreviewResponse(BaseModel):
    matches: list[RegexMatch]


class CheckResponse(BaseModel):
    correct: bool


class PorterChange(BaseModel):
    step: str
    word: str


class PorterExample(BaseModel):
    word: str
    stem: str
    changes: list[PorterChange]


class PorterStateRequest(BaseModel):
    dataset: PredefinedPorterDataset


class PorterStateResponse(BaseModel):
    examples: list[PorterExample]
    quiz_words: list[str]


class PorterAnswer(BaseModel):
    word: str = Field(min_length=1, max_length=64)
    stem: str = Field(max_length=64)


class PorterCheckRequest(PorterStateRequest):
    answers: list[PorterAnswer]
