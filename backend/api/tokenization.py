from fastapi import APIRouter, HTTPException

from models.text_preprocessing import (
    CheckResponse, PorterCheckRequest, PorterStateRequest, PorterStateResponse,
    RegexChoiceRequest, RegexPreviewResponse, RegexStateRequest, RegexStateResponse,
    CustomPorterDataset, PorterGroup, PorterPlacementRequest, PorterStepRequest,
)
from services.text_preprocessing_service import (
    PORTER_QUIZ_WORDS, REGEX_OPTIONS, porter_example, porter_stem,
    REGEX_GOALS, check_regex_goal, evaluate_regex, resolve_pattern,
    resolve_porter_words, resolve_regex_text,
)

router = APIRouter()


@router.post("/regex/state", response_model=RegexStateResponse)
def regex_state(request: RegexStateRequest):
    return RegexStateResponse(text=resolve_regex_text(request.dataset), options=list(REGEX_OPTIONS), goals=list(REGEX_GOALS))


@router.post("/regex/preview", response_model=RegexPreviewResponse)
def regex_preview(request: RegexChoiceRequest):
    try:
        return evaluate_regex(resolve_pattern(request.option_id, request.pattern), resolve_regex_text(request.dataset), request.flags)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/regex/check", response_model=CheckResponse)
def regex_check(request: RegexChoiceRequest):
    try:
        correct = check_regex_goal(request)
        return CheckResponse(correct=correct, message="This pattern meets the objective." if correct else "This pattern does not meet the objective. Inspect its tokens and try another.")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/porter/state", response_model=PorterStateResponse)
def porter_state(request: PorterStateRequest):
    words = resolve_porter_words(request.dataset)
    examples = [porter_example(word) for word in words]
    stems = sorted({example.stem for example in examples})
    return PorterStateResponse(examples=examples,
        quiz_words=list(PORTER_QUIZ_WORDS) if not isinstance(request.dataset, CustomPorterDataset) and request.dataset.name == "suffixes" else words,
        groups=[PorterGroup(stem=stem, words=[item.word for item in examples if item.stem == stem]) for stem in stems])


@router.post("/porter/check", response_model=CheckResponse)
def porter_check(request: PorterCheckRequest):
    answers = {answer.word: answer.stem.strip().lower() for answer in request.answers}
    words = PORTER_QUIZ_WORDS if not isinstance(request.dataset, CustomPorterDataset) and request.dataset.name == "suffixes" else resolve_porter_words(request.dataset)
    correct = (
        len(request.answers) == len(words)
        and len(answers) == len(words)
        and all(answers.get(word) == porter_stem(word) for word in words)
    )
    return CheckResponse(correct=correct)


@router.post("/porter/check-step", response_model=CheckResponse)
def porter_step(request: PorterStepRequest):
    if request.word not in resolve_porter_words(request.dataset):
        raise HTTPException(status_code=400, detail="Word is not in the current dataset")
    step = porter_example(request.word).steps[request.step_index]
    correct = request.answer.strip().lower() == step.after
    return CheckResponse(correct=correct, message=f"{step.before} → {step.after}" if correct else "Try another form. Apply only the current rule group.")


@router.post("/porter/check-placement", response_model=CheckResponse)
def porter_placement(request: PorterPlacementRequest):
    if request.word not in resolve_porter_words(request.dataset):
        raise HTTPException(status_code=400, detail="Word is not in the current dataset")
    expected = porter_stem(request.word)
    correct = request.stem == expected
    return CheckResponse(correct=correct, message=f"{request.word} groups under {expected}." if correct else f"Porter reduces {request.word} to {expected}. Try that group.")
