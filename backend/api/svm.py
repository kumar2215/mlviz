from typing import List
from fastapi import APIRouter, HTTPException

from .models import (
    ParameterInfo,
    SVMTrainRequest,
    SVMTrainResponse,
    SVMVisualisationRequest,
    SVMVisualisationResponse,
    SVMStepRequest,
    SVMStepResponse,
    SVMPredictRequest,
    SVMPredictResponse
)
from services.svm_service import svm_service

router = APIRouter()

@router.get("/params", response_model=List[ParameterInfo])
async def get_parameters() -> List[ParameterInfo]:
    """Get the parameters for SVM Classification."""
    return await svm_service.get_parameters()

@router.post("/visualise", response_model=SVMVisualisationResponse)
async def visualise(
    request: SVMVisualisationRequest,
) -> SVMVisualisationResponse:
    try:
        result = await svm_service.visualise(
            parameters=request.parameters,
            dataset_param=request.dataset,
        )
        return SVMVisualisationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/train", response_model=SVMTrainResponse)
async def train(
    request: SVMTrainRequest,
) -> SVMTrainResponse:
    try:
        result = await svm_service.train(
            parameters=request.parameters,
            dataset_param=request.dataset,
        )
        return SVMTrainResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/step", response_model=SVMStepResponse)
async def step(
    request: SVMStepRequest,
) -> SVMStepResponse:
    try:
        result = await svm_service.step(
            current_w1=request.current_w1,
            current_w2=request.current_w2,
            current_b=request.current_b,
            learning_rate=request.learning_rate,
            parameters=request.parameters,
            dataset_param=request.dataset,
        )
        return SVMStepResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/predict", response_model=SVMPredictResponse)
async def predict(
    request: SVMPredictRequest,
) -> SVMPredictResponse:
    try:
        result = await svm_service.predict(
            w1=request.w1,
            w2=request.w2,
            b=request.b,
            parameters=request.parameters,
            dataset_param=request.dataset,
        )
        return SVMPredictResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
