from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from .models import DatasetListResponse, DatasetResponse
from services import dataset_service
from models import PredefinedClassificationDataset


router = APIRouter()


@router.get("/list", response_model=DatasetListResponse)
async def get_available_datasets():
    """Get a list of all available predefined datasets.

    Returns:
        DatasetListResponse: Dictionary of dataset names and their metadata
    """
    try:
        datasets = await dataset_service.get_available_datasets()
        return DatasetListResponse(datasets=datasets)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/load", response_model=DatasetResponse)
async def load_dataset(
    name: Optional[str] = Query(
        "iris",
        description="ClassificationDataset name (iris, wine, breast_cancer, digits)"
    ),
    test_size: Optional[float] = Query(
        0.25,
        ge=0.1,
        le=0.5,
        description="Proportion of dataset to use for test split"
    ),
    random_state: Optional[int] = Query(
        2025,
        ge=0,
        description="Random seed for train/test split"
    )
):
    """Load a dataset with its full data for visualization.

    Defaults to the Iris dataset if no name is provided.
    Returns the complete dataset including feature values, labels,
    and metadata needed for visualization.

    Args:
        name: ClassificationDataset name (defaults to "iris")
        test_size: Test set proportion (defaults to 0.25)
        random_state: Random seed (defaults to 2025)

    Returns:
        DatasetResponse: Complete dataset with features, labels, and metadata

    Raises:
        HTTPException: If dataset loading fails
    """
    try:
        # Load the predefined dataset
        dataset_ref = PredefinedClassificationDataset(
            name=name,
            test_size=test_size,
            random_state=random_state
        )
        dataset = await dataset_service.load_predefined_dataset(dataset_ref)

        return DatasetResponse(
            success=True,
            X=dataset.X,
            y=dataset.y,
            feature_names=dataset.get_feature_names(),
            target_names=dataset.get_target_names(),
            info=dataset.generate_info(),
            test_size=dataset.test_size,
            random_state=dataset.random_state
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
