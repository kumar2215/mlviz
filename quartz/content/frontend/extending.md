---
title: Extending the Frontend
---

# Extending the Frontend (Detailed Guide)

Adding a new machine learning model to the frontend requires creating a dedicated context that implements the MLviz capability interfaces.

## Concrete Example: Adding "SVM"

Suppose you want to add a Support Vector Machine (SVM) visualization.

### 1. Define Model Data
In your new file `src/contexts/models/SVMContext.tsx`, define the data structure expected from the backend.

```tsx
interface SVMModelData extends BaseModelData {
  vectors: number[][];      // Support vectors
  coefficients: number[];   // Model coefficients
  metadata: {
    feature_names: string[];
    class_names: string[];
  };
}
```

### 2. Create the Context and Provider
Use `createBaseModelContext` to handle the standard state and persistence.

```tsx
const { Provider: BaseProvider, useBaseModel } = createBaseModelContext<SVMModelData>({
  localStorageKey: "svm_model_data",
  paramsStorageKey: "svm_params",
  getParameters: getSVMParamsAPI, // From your API layer
});

export const SVMProvider: React.FC = ({ children }) => (
  <BaseProvider>
    <SVMProviderInner>{children}</SVMProviderInner>
  </BaseProvider>
);
```

### 3. Implement the Logic (Capability Interfaces)
Inside `SVMProviderInner`, implement the interfaces like `TrainableModelContext`.

```tsx
const SVMProviderInner: React.FC = ({ children }) => {
  const { currentModelData, setLastParams, setCurrentModelData } = useBaseModel();
  const [isLoading, setIsLoading] = useState(false);

  const train = async (params) => {
    setIsLoading(true);
    const result = await trainSVM(params); // API Call
    setCurrentModelData(result);
    setLastParams(params);
    setIsLoading(false);
  };

  const contextValue = {
    ...useBaseModel(),
    isLoading,
    train,
    // Add other fields from Predictable or Visualizable interfaces...
  };

  return <SVMContext.Provider value={contextValue}>{children}</SVMContext.Provider>;
};
```

### 4. Register the Model
Finally, you must register your new model in **`src/contexts/ModelContext.tsx`** so the application can route to it.

```tsx
const providers = {
  decision_tree: DecisionTreeProvider,
  knn: KNNProvider,
  kmeans: KMeansProvider,
  svm: SVMProvider, // <--- Add your provider
};

const hooks = {
  decision_tree: useDecisionTree,
  knn: useKNN,
  kmeans: useKMeans,
  svm: useSVM, // <--- Add your hook
};
```

## Creating New Visualization Components

When building the UI for your new model:
1.  Use the `useModel()` hook to access the training/prediction methods.
2.  Use the **Plot Utility functions** in `src/components/plots/utils/` to ensure your points and boundaries align with the rest of the application.
3.  Follow the **HUD pattern** for controls to maintain aesthetic consistency.
