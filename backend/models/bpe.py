from typing import Literal

from pydantic import BaseModel, Field, model_validator


class BpeWord(BaseModel):
    word: str = Field(min_length=1, max_length=64)
    frequency: int = Field(gt=0)

    @model_validator(mode="after")
    def validate_word(self):
        if "</w>" in self.word or any(character.isspace() for character in self.word):
            raise ValueError("Corpus words cannot contain whitespace or the end marker")
        return self


class BpeCorpus(BaseModel):
    words: list[BpeWord] = Field(min_length=1)
    rounds: int = Field(default=2, ge=1, le=20)
    test_words: list[str] = Field(default_factory=list)
    restore_word: str | None = None

    @model_validator(mode="after")
    def validate_examples(self):
        for word in [*self.test_words, *([self.restore_word] if self.restore_word else [])]:
            BpeWord(word=word, frequency=1)
        return self


class PredefinedBpeDataset(BaseModel):
    type: Literal["predefined_bpe"] = "predefined_bpe"
    name: Literal["walkthrough", "practice"]


class BpePair(BaseModel):
    left: str
    right: str


class BpePairCount(BpePair):
    count: int


class BpeTokenWord(BaseModel):
    word: str
    tokens: list[str]
    frequency: int


class BpeRound(BaseModel):
    before: list[BpeTokenWord]
    counts: list[BpePairCount]
    questions: list[BpePair]
    rule: BpePair
    after: list[BpeTokenWord]


class BpeStateRequest(BaseModel):
    dataset: PredefinedBpeDataset


class BpeStateResponse(BaseModel):
    initial: list[BpeTokenWord]
    rounds: list[BpeRound]
    test_words: list[str]
    restore_word: str | None
    restore_initial: list[str] | None


class BpeCountAnswer(BpePair):
    count: int = Field(ge=0)


class BpeCountCheckRequest(BpeStateRequest):
    round_index: int = Field(ge=0)
    answers: list[BpeCountAnswer] = Field(min_length=1)


class BpeMergeCheckRequest(BpeStateRequest):
    round_index: int = Field(ge=0)
    pair: BpePair


class BpeRestoreCheckRequest(BpeStateRequest):
    round_index: int = Field(ge=0)
    selected_index: int = Field(ge=0)
    right_index: int = Field(ge=0)


class BpeTokenAnswer(BaseModel):
    word: str
    tokens: list[str]


class BpeTokenCheckRequest(BpeStateRequest):
    answers: list[BpeTokenAnswer]


class BpeCheckResponse(BaseModel):
    correct: bool
    tokens: list[str] | None = None
