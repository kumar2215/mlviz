from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from models.neural_networks import (
    PerceptronRequest, PerceptronResponse, SingleLayerRequest, SingleLayerResponse,
    MlpRequest, MlpResponse, TrainingRequest, TrainingResponse,
)
from services.neural_network_service import run_lab

router = APIRouter()

def run(lab, request):
    try:
        return run_lab(lab, request)
    except (ValueError, IndexError, OverflowError, ValidationError) as error:
        raise HTTPException(status_code=400, detail=f'Cannot calculate this configuration: {error}') from error

@router.post('/perceptron', response_model=PerceptronResponse)
def perceptron(request: PerceptronRequest):
    return run('perceptron', request)

@router.post('/single_layer', response_model=SingleLayerResponse)
def single_layer(request: SingleLayerRequest):
    return run('single_layer', request)

@router.post('/mlp', response_model=MlpResponse)
def mlp(request: MlpRequest):
    return run('mlp', request)

@router.post('/training', response_model=TrainingResponse)
def training(request: TrainingRequest):
    return run('training', request)
