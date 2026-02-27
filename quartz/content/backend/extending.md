---
title: Extending the Backend
---

# Extending the Backend (Adding a New Model)

To add a new machine learning model or a new type of visualization logic to MLviz, follow these steps.

## Step 1: Define the Data Models
In `backend/api/models.py`, define the Pydantic models for your new endpoint.

```python
class MyNewModelRequest(BaseModel):
    params: Dict[str, Any]
    dataset: Union[PredefinedDataset, Dataset]

class MyNewModelResponse(BaseModel):
    success: bool
    results: List[float]
    metadata: Dict[str, Any]
```

## Step 2: Create a Service
Create a new service file in `backend/services/my_new_service.py`. This service should handle the actual ML logic.

```python
class MyNewService:
    async def train_and_predict(self, request: MyNewModelRequest):
        # 1. Resolve dataset
        # 2. Train model using Scikit-Learn
        # 3. Return results
        pass

my_new_service = MyNewService()
```

## Step 3: Register a Router
Create a new router file in `backend/api/my_new_router.py`.

```python
from fastapi import APIRouter
from services.my_new_service import my_new_service

router = APIRouter()

@router.post("/run")
async def run_model(request: MyNewModelRequest):
    return await my_new_service.train_and_predict(request)
```

## Step 4: Add to main application
In `backend/app.py`, include your new router.

```python
from api import my_new_router

app.include_router(my_new_router.router, prefix="/api/my-new-model", tags=["My New Model"])
```

## Step 5: (Optional) Define Parameter Schema
If your model has configurable parameters that the frontend needs to know about (e.g., for building HUDs), create a JSON file in `backend/config/my_new_params.json`.

```json
{
  "parameters": [
    {
      "name": "n_estimators",
      "type": "slider",
      "min": 1,
      "max": 100,
      "default": 10
    }
  ]
}
```

## Best Practices
- **Use the model cache**: If your model is slow to train, wrap the training logic with `cache_service.get()` and `cache_service.set()`.
- **Consistent Responses**: Ensure your response follows the metadata/results/success pattern used by existing endpoints to simplify frontend integration.
- **Type Hints**: Use Python type hints throughout to ensure robustness and better IDE support.
