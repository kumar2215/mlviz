from fastapi import APIRouter, HTTPException

from models.tokenization import (
    CheckResponse, PorterCheckRequest, PorterStateRequest, PorterStateResponse,
    RegexChoiceRequest, RegexPreviewResponse, RegexStateRequest, RegexStateResponse,
)
from services.tokenization_service import (
    PORTER_EXAMPLES, PORTER_QUIZ_WORDS, REGEX_OPTIONS, REGEX_TEXT,
    porter_example, porter_stem, regex_matches,
)

router = APIRouter()


@router.post("/regex/state", response_model=RegexStateResponse)
def regex_state(request: RegexStateRequest):
    return RegexStateResponse(text=REGEX_TEXT, options=list(REGEX_OPTIONS))


@router.post("/regex/preview", response_model=RegexPreviewResponse)
def regex_preview(request: RegexChoiceRequest):
    try:
        return RegexPreviewResponse(matches=regex_matches(request.option_id))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/regex/check", response_model=CheckResponse)
def regex_check(request: RegexChoiceRequest):
    if request.option_id not in {option.id for option in REGEX_OPTIONS}:
        raise HTTPException(status_code=400, detail="Unknown regex pattern")
    return CheckResponse(correct=request.option_id == "words_and_punctuation")


@router.post("/porter/state", response_model=PorterStateResponse)
def porter_state(request: PorterStateRequest):
    return PorterStateResponse(
        examples=[porter_example(word) for word in PORTER_EXAMPLES],
        quiz_words=list(PORTER_QUIZ_WORDS),
    )


@router.post("/porter/check", response_model=CheckResponse)
def porter_check(request: PorterCheckRequest):
    answers = {answer.word: answer.stem.strip().lower() for answer in request.answers}
    correct = (
        len(request.answers) == len(PORTER_QUIZ_WORDS)
        and len(answers) == len(PORTER_QUIZ_WORDS)
        and all(answers.get(word) == porter_stem(word) for word in PORTER_QUIZ_WORDS)
    )
    return CheckResponse(correct=correct)
