---
title: Model Contexts & State Management
---

# Model Contexts (Frontend)

MLviz uses a hierarchical context system to manage the state of machine learning models. This ensures that persistence, data sharing, and UI updates are handled consistently across different model types.

## 1. BaseModelContext

The foundation of the system is the `BaseModelContext`. It provides common infrastructure for all models:
-   **Persistence**: Automatically syncs model data and parameters to `localStorage`.
-   **Shared State**: Manages `currentModelData` and `lastParams`.
-   **Standardized API**: Provides a uniform way to fetch model parameters.

### Capability Interfaces
We use TypeScript interfaces to define what a model context "can do". A specific model context (like `KNNContext`) can implement one or more of these:

*   **`TrainableModelContext`**: For models that support standard training and metrics display.
*   **`PredictableModelContext`**: For models that allow user input for point-based predictions (supports both client-side and server-side prediction).
*   **`VisualizableModelContext`**: For models that generate complex visualization data (e.g., decision boundaries).
*   **`StepableModelContext`**: For iterative algorithms (like KMeans) that require a step-by-step progress state.

## 2. Implementing a Model Context

To create a new model context, we use the `createBaseModelContext` helper.

```tsx
const { Provider: BaseProvider, useBaseModel } = createBaseModelContext<MyModelData>({
    localStorageKey: "my_model_data",
    paramsStorageKey: "my_params",
    getParameters: getParametersAPI,
});
```

The model-specific provider wraps the `BaseProvider`, allowing it to access and extend the base state with specialized logic.

## 3. The Model Routing Pattern

In MLviz, visualizations are often driven by a configuration file (`config.json`). The **`ModelContext.tsx`** acts as a dynamic router:

1.  **Selection**: It reads the `model_name` from the active story page.
2.  **Injection**: It wraps the application tree with the corresponding provider (e.g., `KNNProvider`).
3.  **Unified Access**: It provides the `useModel` hook, which automatically returns the context for the *active* model.

### Why this pattern?
This allows components like HUDs or Plot Containers to be **model-agnostic**. A "Train Button" can simply call `useModel().train(params)` without knowing whether it is training a Decision Tree or a KNN model.
