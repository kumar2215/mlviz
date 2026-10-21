from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class PredefinedRegexDataset(BaseModel):
    type: Literal["predefined_regex"] = "predefined_regex"
    name: Literal["punctuation"]


class PredefinedPorterDataset(BaseModel):
    type: Literal["predefined_porter"] = "predefined_porter"
    name: Literal["rules", "suffixes", "families"]


class CustomRegexDataset(BaseModel):
    type: Literal["custom_regex"] = "custom_regex"
    text: str = Field(min_length=1, max_length=2000)


class CustomPorterDataset(BaseModel):
    type: Literal["custom_porter"] = "custom_porter"
    words: list[str] = Field(min_length=1, max_length=6)

    @field_validator("words")
    @classmethod
    def validate_words(cls, words):
        import re
        normalized = [word.strip().lower() for word in words]
        if any(not re.fullmatch(r"[a-z]{1,32}", word) for word in normalized):
            raise ValueError("Use English words with 1–32 letters")
        if len(set(normalized)) != len(normalized):
            raise ValueError("Use distinct words")
        return normalized


RegexDataset = Annotated[PredefinedRegexDataset | CustomRegexDataset, Field(discriminator="type")]
PorterDataset = Annotated[PredefinedPorterDataset | CustomPorterDataset, Field(discriminator="type")]


class RegexOption(BaseModel):
    id: str
    label: str
    pattern: str


class RegexMatch(BaseModel):
    text: str
    start: int
    end: int


class RegexStateRequest(BaseModel):
    dataset: RegexDataset


class RegexGoal(BaseModel):
    id: str
    title: str
    text: str


class RegexStateResponse(BaseModel):
    text: str
    options: list[RegexOption]
    goals: list[RegexGoal]


class RegexChoiceRequest(RegexStateRequest):
    option_id: str | None = Field(default=None, min_length=1, max_length=64)
    pattern: str | None = Field(default=None, min_length=1, max_length=256)
    flags: list[Literal["IGNORECASE", "MULTILINE", "DOTALL"]] = Field(default_factory=list, max_length=3)
    goal_id: str = Field(default="contractions", max_length=64)

    @model_validator(mode="after")
    def validate_choice(self):
        if (self.option_id is None) == (self.pattern is None):
            raise ValueError("Choose a preset or enter a pattern")
        return self


class RegexPreviewResponse(BaseModel):
    matches: list[RegexMatch]
    truncated: bool = False


class CheckResponse(BaseModel):
    correct: bool
    message: str = ""


class PorterChange(BaseModel):
    step: str
    word: str


class PorterExample(BaseModel):
    word: str
    stem: str
    changes: list[PorterChange]
    steps: list["PorterStep"] = Field(default_factory=list)


class PorterStep(BaseModel):
    index: int
    label: str
    before: str
    after: str
    candidates: list[str]


class PorterGroup(BaseModel):
    stem: str
    words: list[str]


class PorterStateRequest(BaseModel):
    dataset: PorterDataset


class PorterStateResponse(BaseModel):
    examples: list[PorterExample]
    quiz_words: list[str]
    groups: list[PorterGroup]


class PorterAnswer(BaseModel):
    word: str = Field(min_length=1, max_length=64)
    stem: str = Field(max_length=64)


class PorterCheckRequest(PorterStateRequest):
    answers: list[PorterAnswer]


class PorterStepRequest(PorterStateRequest):
    word: str = Field(min_length=1, max_length=32)
    step_index: int = Field(ge=0, le=5)
    answer: str = Field(max_length=32)


class PorterPlacementRequest(PorterStateRequest):
    word: str = Field(min_length=1, max_length=32)
    stem: str = Field(max_length=32)
