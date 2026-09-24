import {
    getParameters as getParametersAPI,
    getVisualisation,
    predict as predictAPI,
    train as trainKNN,
    type KNNPredictionRequest,
    type KNNPredictionResponse,
    type KNNVisualisationRequest,
    type KNNVisualisationResponse,
} from "@/api/knn";
import { useDataset } from "@/store/useDataset";
import {
    createBaseModelStore,
    type BaseModelData,
    type PredictableModelState,
    type PredictionResult,
    type TrainableModelState,
    type VisualizableModelState,
} from "@/store/createBaseModelStore";

// Define comprehensive KNN model data type
interface KNNModelData extends BaseModelData, KNNVisualisationResponse {
    // Persisted query points (optional)
    queryPoints: number[][] | null;
}

// ============================================================================
// Types
// ============================================================================
interface KNNStore
    extends TrainableModelState<KNNModelData>,
        PredictableModelState<KNNModelData, KNNPredictionResponse>,
        VisualizableModelState<KNNModelData> {
    // KNN-specific properties (backward compatibility or specialized)
    // Prediction state (Original names)
    isPredictionLoading: boolean;
    predictionError: string | null;
    predictionData: KNNPredictionResponse | null;
    queryPoints: number[][] | null;
    // Visualization/Training state (Original names)
    isVisualizationLoading: boolean;
    visualizationError: string | null;
    visualizationData: KNNModelData | null;
    lastVisualizationParams: Partial<KNNVisualisationRequest>;
    getK: () => number | null;
    // Specialized methods
    loadVisualization: (params?: Partial<KNNVisualisationRequest>) => Promise<KNNModelData | null>;
    train: (params: Partial<KNNVisualisationRequest>) => Promise<KNNModelData | null>;
    makePrediction: (params: Partial<KNNPredictionRequest>) => Promise<void>;
    isVisualizationReady: () => boolean;
}

export const useKNN = createBaseModelStore<KNNModelData, KNNStore>(
    {
        localStorageKey: "knn_model_data",
        paramsStorageKey: "knn_params",
        getParameters: getParametersAPI,
    },
    (set, get, baseState) => {
        const {
            currentModelData,
            lastParams,
            setCurrentModelData,
            setLastParams,
            resetModelData: baseResetModelData,
            getLastParams,
            getParameters,
        } = baseState;
        const isVisualizationLoading = false;
        const visualizationError = null as string | null;
        const isPredictionLoading = false;
        const predictionError = null as string | null;
        const predictionData = null as KNNPredictionResponse | null;
        const queryPoints = (currentModelData?.queryPoints || null) as number[][] | null;

        const loadVisualization = async (request: Partial<KNNVisualisationRequest> = {}) => {
            const { activeDataset } = useDataset.getState();
            // Update loading state
            set({ isVisualizationLoading: true, visualizationError: null });
            try {
                const { feature_1, feature_2, ...rest } = request as any;
                const visualisation_features =
                    feature_1 !== undefined && feature_2 !== undefined
                        ? [Number(feature_1), Number(feature_2)]
                        : request.visualisation_features;
                const requestWithDataset: any = {
                    parameters: rest,
                    visualisation_features,
                    dataset: request.dataset || activeDataset || undefined,
                };
                const data = await getVisualisation(requestWithDataset);
                if (data.success) {
                    setCurrentModelData((prev) => ({
                        ...data,
                        queryPoints: prev?.queryPoints || null,
                    }));
                    set({ isVisualizationLoading: false, visualizationError: null });
                    setLastParams(request);
                    return { ...data, queryPoints: null } as KNNModelData;
                } else {
                    throw new Error("Visualization failed - API returned success: false");
                }
            } catch (error) {
                console.error("Failed to load KNN visualization:", error);
                set({
                    isVisualizationLoading: false,
                    visualizationError:
                        error instanceof Error
                            ? error.message
                            : "Unknown error loading KNN visualization",
                });
                return null;
            }
        };

        const trainModel = async (params?: Partial<KNNVisualisationRequest>) => {
            const { activeDataset } = useDataset.getState();
            set({ isVisualizationLoading: true, visualizationError: null });
            try {
                // Extract top-level request fields from the flat params object
                const {
                    include_boundary,
                    boundary_resolution,
                    dataset,
                    feature_1,
                    feature_2,
                    ...algorithmParams
                } = (params || {}) as any;
                // Build the parameters object for the algorithm (including features for backend validation)
                const parameters = {
                    ...algorithmParams,
                    feature_1: feature_1 !== undefined ? Number(feature_1) : 0,
                    feature_2: feature_2 !== undefined ? Number(feature_2) : 1,
                };
                // Map visualization features array
                const visualisation_features =
                    feature_1 !== undefined && feature_2 !== undefined
                        ? Number(feature_1) == Number(feature_2)
                            ? [Number(feature_1)]
                            : [Number(feature_1), Number(feature_2)]
                        : params?.visualisation_features;
                const requestWithDataset: any = {
                    parameters,
                    visualisation_features,
                    include_boundary,
                    boundary_resolution,
                    dataset: dataset || activeDataset || undefined,
                };
                const data = await trainKNN(requestWithDataset);
                if (data.success) {
                    console.log("Training successful:", data);
                    setCurrentModelData({
                        ...data,
                        queryPoints: null,
                    });
                    set({ isVisualizationLoading: false, visualizationError: null });
                    setLastParams(params || {});
                    return { ...data, queryPoints: null } as KNNModelData;
                } else {
                    return null;
                }
            } catch (error) {
                console.error("Error training KNN:", error);
                set({
                    isVisualizationLoading: false,
                    visualizationError:
                        error instanceof Error ? error.message : "Unknown error training KNN model",
                });
                return null;
            }
        };

        const getFeatureNames = (): string[] | null => {
            const { predictionData, visualizationData } = get();
            return (
                visualizationData?.metadata?.feature_names || predictionData?.feature_names || null
            );
        };

        const getPredictiveFeatureNames = (): string[] | null => {
            const { visualizationData } = get();
            return visualizationData?.visualisation_feature_names || getFeatureNames();
        };

        const getClassNames = (): string[] | null => {
            const { predictionData, visualizationData } = get();
            return visualizationData?.metadata?.class_names || predictionData?.class_names || null;
        };

        const getK = (): number | null => {
            const { lastParams, predictionData } = get();
            if (predictionData?.neighbors_info?.[0]) {
                return predictionData.neighbors_info[0].length;
            }
            // Support both flat and nested parameter structures
            return lastParams?.n_neighbors || lastParams?.parameters?.n_neighbors || null;
        };

        const isVisualizationReady = (): boolean => {
            const { visualizationData } = get();
            return !!(
                visualizationData?.success &&
                visualizationData?.metadata?.feature_names &&
                visualizationData?.metadata?.class_names
            );
        };

        const makePrediction = async (request: Partial<KNNPredictionRequest>) => {
            const { activeDataset } = useDataset.getState();
            set({ isPredictionLoading: true, predictionError: null });
            try {
                // Extract top-level request fields from the flat params object
                const {
                    feature_1,
                    feature_2,
                    include_boundary,
                    boundary_resolution,
                    dataset,
                    query_points,
                    ...algorithmParams
                } = request as any;
                // Build the parameters object for the algorithm
                const parameters = {
                    ...algorithmParams,
                    feature_1: feature_1 !== undefined ? Number(feature_1) : 0,
                    feature_2: feature_2 !== undefined ? Number(feature_2) : 1,
                };
                const visualisation_features =
                    feature_1 !== undefined && feature_2 !== undefined
                        ? [Number(feature_1), Number(feature_2)]
                        : request.visualisation_features;
                const requestWithDataset: any = {
                    parameters,
                    visualisation_features,
                    query_points: query_points || request.query_points || undefined,
                    include_boundary,
                    boundary_resolution,
                    dataset: dataset || activeDataset || undefined,
                };
                const data = await predictAPI(requestWithDataset);
                if (data.success) {
                    set({
                        predictionData: data,
                        isPredictionLoading: false,
                        predictionError: null,
                    });
                    const finalQueryPoints = query_points || request.query_points || null;
                    set({ queryPoints: finalQueryPoints });
                    // Opt-in: persist query points if desired
                    setCurrentModelData((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  queryPoints: finalQueryPoints,
                              }
                            : null,
                    );
                } else {
                    throw new Error("Prediction failed - API returned success: false");
                }
            } catch (error) {
                console.error("Failed to make KNN prediction:", error);
                set({
                    predictionData: null,
                    isPredictionLoading: false,
                    predictionError:
                        error instanceof Error ? error.message : "Unknown error making prediction",
                });
            }
        };

        const predict = async (points: Record<string, number>) => {
            const { visualizationData } = get();
            const featureNames = getFeatureNames();
            if (!featureNames) return;
            // Convert points object to array format expected by API
            const queryPoint = featureNames.map((name) => points[name] || 0);
            await makePrediction({
                query_points: [queryPoint],
                visualisation_features:
                    visualizationData?.visualisation_feature_indices || undefined,
            });
        };

        const clearPrediction = () => {
            set({
                predictionData: null,
                predictionError: null,
                isPredictionLoading: false,
                queryPoints: null,
            });
            // Also clear persisted query points
            setCurrentModelData((prev) =>
                prev
                    ? {
                          ...prev,
                          queryPoints: null,
                      }
                    : null,
            );
        };

        const resetModelData = () => {
            console.log("[KNNStore] Resetting model data");
            baseResetModelData();
        };
        const visualizationData = currentModelData || null;
        const predictionResult: PredictionResult<KNNPredictionResponse> | null = (() => {
            if (!predictionData || !predictionData.predictions?.[0]) return null;
            return {
                predictedClass: predictionData.predictions[0],
                predictedClassIndex: predictionData.prediction_indices?.[0] ?? -1,
                // confidence is optional but KNN doesn't naturally provide it without extra work
                additionalData: predictionData,
            };
        })();
        return {
            // BaseModelState
            currentModelData,
            lastParams,
            setCurrentModelData,
            setLastParams,
            resetModelData,
            getLastParams,
            getParameters,
            // TrainableModelState
            isLoading: isVisualizationLoading,
            error: visualizationError,
            data: currentModelData,
            train: trainModel,
            // PredictableModelState
            isPredicting: isPredictionLoading,
            predictionError,
            predictionResult,
            predict,
            clearPrediction,
            getFeatureNames,
            getClassNames,
            getPredictiveFeatureNames,
            // VisualizableModelState
            isVisualizing: isVisualizationLoading,
            visualizationError,
            visualizationData,
            loadVisualization,
            // KNN-specifics (Original names for backward compatibility)
            isPredictionLoading,
            predictionData,
            queryPoints,
            isVisualizationLoading,
            lastVisualizationParams: lastParams,
            makePrediction,
            getK,
            isVisualizationReady,
        };
    },
    deriveKNNState,
);

function deriveKNNState(state: KNNStore, previous?: KNNStore): Partial<KNNStore> {
    const prediction = state.predictionData;
    return {
        data: state.currentModelData,
        visualizationData: state.currentModelData,
        isLoading: state.isVisualizationLoading,
        isVisualizing: state.isVisualizationLoading,
        error: state.visualizationError,
        isPredicting: state.isPredictionLoading,
        lastVisualizationParams: state.lastParams,
        queryPoints:
            state.currentModelData?.queryPoints !== previous?.currentModelData?.queryPoints
                ? (state.currentModelData?.queryPoints ?? null)
                : state.queryPoints,
        predictionResult: prediction?.predictions?.[0]
            ? {
                  predictedClass: prediction.predictions[0],
                  predictedClassIndex: prediction.prediction_indices?.[0] ?? -1,
                  additionalData: prediction,
              }
            : null,
    };
}
