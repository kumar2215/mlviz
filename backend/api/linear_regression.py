from typing import List, Optional
from fastapi import APIRouter, HTTPException
from .models import (
    LinearRegressionVisualisationRequest,
    LinearRegressionVisualisationResponse,
    LinearRegressionTrainRequest,
    LinearRegressionTrainResponse,
    LinearRegressionStepRequest,
    LinearRegressionStepResponse,
    ParameterInfo,
)
from services import linear_regression_service

router = APIRouter()


@router.get("/params", response_model=List[ParameterInfo])
async def get_parameters() -> List[ParameterInfo]:
    """Get the parameters for Linear Regression.

    Returns:
        List[ParameterInfo]: List of parameters for Linear Regression
    """
    return await linear_regression_service.get_parameters()


@router.post("/visualise", response_model=LinearRegressionVisualisationResponse)
async def visualise(
    request: LinearRegressionVisualisationRequest,
) -> LinearRegressionVisualisationResponse:
    """Return raw scatter data for the chosen feature vs target.

    No model fitting is performed. The frontend renders the scatter plot
    and computes R² live for any user-controlled line.

    Args:
        request: Visualisation request with parameters and optional dataset

    Raises:
        HTTPException: If visualisation data generation fails

    Returns:
        LinearRegressionVisualisationResponse: Scatter points, axis ranges, metadata
    """
    try:
        result = await linear_regression_service.visualise(
            parameters=request.parameters,
            dataset_param=request.dataset,
        )
        return LinearRegressionVisualisationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/train", response_model=LinearRegressionTrainResponse)
async def train(
    request: LinearRegressionTrainRequest,
) -> LinearRegressionTrainResponse:
    """Fit an OLS Linear Regression model and return the optimal line + metrics.

    Splits the dataset into train/test sets, fits on the chosen feature (feature_x),
    and returns the optimal slope and intercept alongside full regression metrics.

    The frontend uses the optimal line as the "target" the user tries to
    match interactively with a slider. R² is computed on the frontend from
    the returned points.

    Args:
        request: Training request with parameters and optional dataset

    Raises:
        HTTPException: If training fails

    Returns:
        LinearRegressionTrainResponse: Scatter points, optimal line, train/test metrics
    """
    try:
        result = await linear_regression_service.train(
            parameters=request.parameters,
            dataset_param=request.dataset,
        )
        return LinearRegressionTrainResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/step", response_model=LinearRegressionStepResponse)
async def step(
    request: LinearRegressionStepRequest,
) -> LinearRegressionStepResponse:
    """Perform a single gradient descent step.

    Fully stateless — the frontend owns the current slope/intercept and
    passes them on each 'Next Step' button press. The server computes one
    gradient descent update and returns the proposed new line.

    The user can then:
    - **Accept**: update frontend state with new_slope/new_intercept
    - **Reject**: keep the current slope/intercept

    Args:
        request: Current line parameters + data points

    Raises:
        HTTPException: If gradient descent step fails

    Returns:
        LinearRegressionStepResponse: Proposed new line, gradients, loss before/after,
            and full regression metrics for both current and proposed states
    """
    try:
        result = await linear_regression_service.step(
            slope=request.slope,
            intercept=request.intercept,
            learning_rate=request.learning_rate,
            points=request.points,
            fit_intercept=request.fit_intercept,
        )
        return LinearRegressionStepResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
