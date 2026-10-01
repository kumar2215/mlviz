from fastapi import APIRouter, HTTPException

from models.bpe import (
    BpeCheckResponse, BpeCountCheckRequest, BpeMergeCheckRequest,
    BpeRestoreCheckRequest, BpeStateRequest, BpeStateResponse,
    BpeTokenCheckRequest,
)
from services.bpe_service import merge_tokens, tokenize, train

router = APIRouter()


def get_round(state: BpeStateResponse, index: int):
    if index >= len(state.rounds):
        raise HTTPException(status_code=400, detail="Round index is out of range")
    return state.rounds[index]


@router.post("/state", response_model=BpeStateResponse)
def state(request: BpeStateRequest):
    return train(request.dataset)


@router.post("/check-counts", response_model=BpeCheckResponse)
def check_counts(request: BpeCountCheckRequest):
    round_data = get_round(train(request.dataset), request.round_index)
    expected = {(pair.left, pair.right): pair.count for pair in round_data.counts}
    unique = {(answer.left, answer.right) for answer in request.answers}
    questions = {(pair.left, pair.right) for pair in round_data.questions}
    correct = unique == questions and len(unique) == len(request.answers) and all(
        expected.get((answer.left, answer.right)) == answer.count
        for answer in request.answers
    )
    return BpeCheckResponse(correct=correct)


@router.post("/check-merge", response_model=BpeCheckResponse)
def check_merge(request: BpeMergeCheckRequest):
    rule = get_round(train(request.dataset), request.round_index).rule
    return BpeCheckResponse(correct=request.pair == rule)


@router.post("/check-restore", response_model=BpeCheckResponse)
def check_restore(request: BpeRestoreCheckRequest):
    state_data = train(request.dataset)
    if state_data.restore_word is None:
        raise HTTPException(status_code=400, detail="Dataset has no restoration word")
    round_data = get_round(state_data, request.round_index)
    tokens = state_data.restore_initial
    for earlier_round in state_data.rounds[:request.round_index]:
        tokens = merge_tokens(tokens, earlier_round.rule)
    index = request.selected_index
    correct = (
        request.right_index == index + 1
        and
        index + 1 < len(tokens)
        and tokens[index] == round_data.rule.left
        and tokens[index + 1] == round_data.rule.right
    )
    return BpeCheckResponse(correct=correct, tokens=merge_tokens(tokens, round_data.rule) if correct else tokens)


@router.post("/check-tokenizations", response_model=BpeCheckResponse)
def check_tokenizations(request: BpeTokenCheckRequest):
    state_data = train(request.dataset)
    expected_words = state_data.test_words
    given = {answer.word: answer.tokens for answer in request.answers}
    correct = (
        len(request.answers) == len(expected_words)
        and len(given) == len(expected_words)
        and all(given.get(word) == tokenize(word, state_data.rounds) for word in expected_words)
    )
    return BpeCheckResponse(correct=correct)
