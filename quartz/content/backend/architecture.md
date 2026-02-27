---
title: Backend Deep Dive
---

# Backend Deep Dive (FastAPI)

This document provides a deeper look into the patterns used in the MLviz backend to support dynamic model training and dataset management.

## 1. Dataset Resolution

All services in MLviz should use the `dataset_service` to resolve incoming dataset parameters.

### Pattern: `_resolve_dataset`
In your service class, implement a helper to normalize different input types (UIDs, raw data, or names).

```python
async def _resolve_dataset(self, dataset_param: Optional[Union[Dict, PredefinedDataset, Dataset]]) -> Dataset:
    if dataset_param is None:
        return await self.dataset_service.load_predefined_dataset(PredefinedDataset(name="iris"))
    # ... logic to handle different types ...
    return dataset_param
```

### Training Context
Use `prepare_dataset_for_training` to handle the heavy lifting (Numpy conversion, train/test splitting).

```python
dataset_info = await self.dataset_service.prepare_dataset_for_training(dataset)
# Access data via keys: X_train, y_train, feature_names, etc.
```

## 2. Dynamic Parameters (`ParameterInfo`)

MLviz uses a dynamic parameter system to drive the frontend HUDs. This allows you to add or change model parameters without touching the frontend code.

### The Schema
Each model has a JSON file in `backend/config/` defining its parameters.

```json
{
  "name": "n_neighbors",
  "label": "Number of Neighbors",
  "type": "slider",
  "min": 1,
  "max": 20,
  "default": 5,
  "step": 1
}
```

### Supported Types
-   `slider`: Numeric range.
-   `select`: Categorical choice (requires `options`).
-   `toggle`: Boolean on/off.
-   `number`: Manual numeric input.

## 3. The Router-Service Pattern

To keep the codebase maintainable:
1.  **Router**: Handles the `/api/` HTTP interface, Pydantic validation, and redirects.
2.  **Service**: Pure logic, Scikit-Learn interactions, and caching.
3.  **Models**: Domain objects and request/response schemas.

### Example Workflow
1.  **Frontend** calls `/api/knn/train_params` -> **Router** calls `service.get_parameters()` -> returns JSON config.
2.  **Frontend** renders HUD based on JSON.
3.  **Frontend** calls `/api/knn/train` with user values -> **Router** validates with Pydantic -> **Service** trains model and returns results.
