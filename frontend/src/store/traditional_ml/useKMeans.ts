import {
    getParameters as getParametersAPI,
    predict as predictAPI,
    step as stepAPI,
    train as trainAPI,
    type KMeansPredictRequest,
    type KMeansPredictResponse,
    type KMeansStepRequest,
    type KMeansStepResponse,
    type KMeansTrainRequest,
    type KMeansTrainResponse,
} from "@/api/kmeans";
import { useDataset } from "@/store/useDataset";
import {
    createBaseModelStore,
    type BaseModelData,
    type PredictableModelState,
    type PredictionResult,
    type StepableModelState,
    type TrainableModelState,
    type VisualizableModelState,
} from "@/store/createBaseModelStore";
import type { Dispatch, SetStateAction } from "react";

// ============================================================================
// Types
// ============================================================================
/**
 * KMeans-specific model data
 * Extends base model data with KMeans training response data
 */
interface KMeansModelData extends BaseModelData, KMeansTrainResponse {
    // Persisted query points (optional)
    queryPoints: number[][] | null;
    metrics?: Record<string, number>;
}

/**
 * KMeans-specific prediction additional data
 * Contains cluster assignment details
 */
export interface KMeansPredictionAdditionalData {
    assignments: number[];
    distance_matrix: number[][];
    assigned_distances: number[];
    centroids: number[][];
}

interface KMeansStore
    extends TrainableModelState<KMeansModelData>,
        PredictableModelState<KMeansModelData, KMeansPredictionAdditionalData>,
        VisualizableModelState<KMeansModelData>,
        StepableModelState<KMeansModelData, KMeansStepResponse, Partial<KMeansStepRequest>> {
    // KMeans-specific properties
    isStepLoading: boolean;
    stepError: string | null;
    stepData: KMeansStepResponse | null;
    // Prediction state (Original names for backward compatibility)
    isPredictionLoading: boolean;
    predictionError: string | null;
    predictionData: KMeansPredictResponse | null;
    queryPoints: number[][] | null;
    // Visualization/Training state (Original names)
    isVisualizationLoading: boolean;
    visualizationError: string | null;
    visualizationData: KMeansModelData | null;
    lastVisualizationParams: Partial<KMeansTrainRequest>;
    // Specialized methods
    performStep: (request: Partial<KMeansStepRequest>) => Promise<KMeansModelData | null>;
    loadVisualization: (params?: Partial<KMeansTrainRequest>) => Promise<KMeansModelData | null>;
    train: (params: Partial<KMeansTrainRequest>) => Promise<KMeansModelData | null>;
    makePrediction: (
        request: Partial<KMeansPredictRequest>,
    ) => Promise<KMeansPredictResponse | undefined>;
    getClusterCount: () => number | null;
    getCentroids: () => number[][] | null;
    isVisualizationReady: () => boolean;
    // Centroid selection state
    selectedCentroids: number[][];
    setSelectedCentroids: Dispatch<SetStateAction<number[][]>>;
    clearSelectedCentroids: () => void;
    isPlacingCentroids: boolean;
    setIsPlacingCentroids: Dispatch<SetStateAction<boolean>>;
    // Centroid trail history (step mode): oldest → newest snapshot, cleared on reset
    centroidHistory: number[][][];
    /**
     * Surgically clears iterative state (centroids, history, step results)
     * while preserving the base visualization data (points, background).
     */
    clearIterationState: () => void;
}

export const useKMeans = createBaseModelStore<KMeansModelData, KMeansStore>(
    {
        localStorageKey: "kmeans_model_data",
        paramsStorageKey: "kmeans_params",
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
        const isStepLoading = false;
        const stepError = null as string | null;
        const stepData = null as KMeansStepResponse | null;
        const isPredictionLoading = false;
        const predictionError = null as string | null;
        const predictionData = null as KMeansPredictResponse | null;
        const queryPoints = (currentModelData?.queryPoints || null) as number[][] | null;
        const selectedCentroids = (currentModelData?.final_centroids || []) as number[][];
        const isPlacingCentroids = true;
        const centroidHistory = [] as number[][][];

        const setSelectedCentroids = (
            value: number[][] | ((previous: number[][]) => number[][]),
        ) => {
            set((state) => ({
                selectedCentroids:
                    typeof value === "function" ? value(state.selectedCentroids) : value,
            }));
        };

        const setIsPlacingCentroids = (value: boolean | ((previous: boolean) => boolean)) => {
            set((state) => ({
                isPlacingCentroids:
                    typeof value === "function" ? value(state.isPlacingCentroids) : value,
            }));
        };

        const trainModel = async (
            params?: Partial<KMeansTrainRequest>,
        ): Promise<KMeansModelData | null> => {
            const { activeDataset } = useDataset.getState();
            set({ isVisualizationLoading: true, visualizationError: null });
            try {
                // Automatically include selected centroids if not provided
                // Read current centroids when the action runs
                const currentCentroids = get().selectedCentroids;
                // Restructure parameters for API compatibility
                const {
                    include_boundary,
                    boundary_resolution,
                    max_iterations,
                    feature_1,
                    feature_2,
                    ...paramsForAlgorithm
                } = (params as any) || {};
                // Map visualization features
                const vizFeatures =
                    feature_1 !== undefined
                        ? feature_2 !== undefined && feature_2 !== feature_1
                            ? [feature_1, feature_2]
                            : [feature_1]
                        : undefined;
                const requestParams: Partial<KMeansTrainRequest> = {
                    parameters: {
                        ...paramsForAlgorithm,
                        feature_1: feature_1 ?? 0,
                        feature_2: feature_2 ?? 1,
                    } as any,
                    centroids:
                        params?.centroids ||
                        (currentCentroids.length > 0 ? currentCentroids : undefined),
                    visualisation_features: vizFeatures,
                    include_boundary,
                    boundary_resolution,
                    max_iterations,
                    // Use dataset from params if provided, otherwise use activeDataset from store
                    dataset:
                        params?.dataset ||
                        (activeDataset?.type === "custom" || activeDataset?.type === "predefined"
                            ? activeDataset
                            : undefined),
                };
                const data = await trainAPI(requestParams);
                if (data.success) {
                    console.log("Training successful:", data);
                    const modelData = {
                        ...data,
                        queryPoints: null,
                    } as unknown as KMeansModelData;
                    setCurrentModelData(modelData);
                    // Update selected centroids to the final results
                    if (data.final_centroids) {
                        setSelectedCentroids(data.final_centroids);
                    }
                    setIsPlacingCentroids(false);
                    set({ isVisualizationLoading: false, visualizationError: null });
                    // Store only algorithm parameters, not the actual centroids
                    // This ensures that subsequent calls (like from HUD) don't re-send stale/empty centroid lists
                    const { centroids: _c, ...lastStoredParams } = (params || {}) as any;
                    setLastParams(lastStoredParams);
                    return modelData;
                } else {
                    throw new Error("Training failed");
                }
            } catch (error) {
                console.error("Error training KMeans:", error);
                set({
                    isVisualizationLoading: false,
                    visualizationError:
                        error instanceof Error
                            ? error.message
                            : "Unknown error training KMeans model",
                });
                return null;
            }
        };

        const clearIterationState = () => {
            console.log("[KMeansStore] Clearing iterative state (keeping base data)");
            set({ stepData: null });
            setSelectedCentroids([]);
            set({ centroidHistory: [], stepError: null, visualizationError: null });
        };

        const loadVisualization = async (
            params?: Partial<KMeansTrainRequest>,
        ): Promise<KMeansModelData | null> => {
            set({ isVisualizationLoading: true, visualizationError: null });
            try {
                // For KMeans, visualization is primarily the data points
                // Force centroids to empty to avoid premature training when applying hyperparams
                const data = await trainModel({
                    ...params,
                    centroids: [],
                });
                clearIterationState();
                setIsPlacingCentroids(true);
                return data;
            } catch (error) {
                console.error("Failed to load KMeans visualization:", error);
                set({ isVisualizationLoading: false });
                return null;
            }
        };

        const performStep = async (
            request: Partial<KMeansStepRequest>,
        ): Promise<KMeansModelData | null> => {
            const { currentModelData } = get();
            const { activeDataset } = useDataset.getState();
            set({ isStepLoading: true, stepError: null });
            try {
                // Automatically include selected centroids if not provided
                const currentCentroids = get().selectedCentroids;
                // Restructure parameters for API compatibility
                const {
                    include_boundary,
                    boundary_resolution,
                    feature_1,
                    feature_2,
                    ...paramsForAlgorithm
                } = (request as any) || {};
                // Map visualization features
                const vizFeatures =
                    feature_1 !== undefined
                        ? feature_2 !== undefined && feature_2 !== feature_1
                            ? [feature_1, feature_2]
                            : [feature_1]
                        : undefined;
                const requestParams: Partial<KMeansStepRequest> = {
                    parameters: {
                        ...paramsForAlgorithm,
                        feature_1: feature_1 ?? 0,
                        feature_2: feature_2 ?? 1,
                    } as any,
                    centroids:
                        request?.centroids ||
                        (currentCentroids.length > 0 ? currentCentroids : undefined),
                    visualisation_features: vizFeatures,
                    include_boundary,
                    boundary_resolution,
                    // Use dataset from request if provided, otherwise use activeDataset from store
                    dataset:
                        request?.dataset ||
                        (activeDataset?.type === "custom" || activeDataset?.type === "predefined"
                            ? activeDataset
                            : undefined),
                };
                const data = await stepAPI(requestParams);
                if (data.success) {
                    set({ stepData: data });
                    // Record the OLD centroid positions in history before moving to new ones
                    const prevCentroids = get().selectedCentroids;
                    if (prevCentroids.length > 0) {
                        set((state) => ({
                            centroidHistory: ((prev: number[][][]) => [...prev, prevCentroids])(
                                state.centroidHistory,
                            ),
                        }));
                    }
                    // Update selected centroids to the new positions
                    if (data.new_centroids) {
                        setSelectedCentroids(data.new_centroids);
                    }
                    // PERSISTENCE: Update the common model data so it survives refresh
                    let updatedModelData: KMeansModelData | null = null;
                    setCurrentModelData((prev) => {
                        const total_iterations = prev?.total_iterations || 0;
                        const baseData = {
                            success: data.success,
                            data_points: data.data_points,
                            final_centroids: data.new_centroids,
                            final_assignments: data.assignments,
                            metadata: data.metadata,
                            visualisation_feature_indices: data.visualisation_feature_indices,
                            visualisation_feature_names: data.visualisation_feature_names,
                            decision_boundary: data.decision_boundary,
                            iterations: [
                                {
                                    iteration: total_iterations,
                                    assignments: data.assignments,
                                    distance_matrix: data.distance_matrix,
                                    centroids: data.centroids,
                                    new_centroids: data.new_centroids,
                                    centroid_shifts: data.centroid_shifts,
                                    converged: data.converged,
                                    cluster_info: data.cluster_info,
                                },
                            ],
                            total_iterations: total_iterations + 1,
                            converged: data.converged,
                            queryPoints: prev?.queryPoints || null,
                        };
                        if (prev) {
                            updatedModelData = {
                                ...prev,
                                ...baseData,
                                iterations: [...(prev.iterations || []), ...baseData.iterations],
                            } as unknown as KMeansModelData;
                        } else {
                            updatedModelData = baseData as unknown as KMeansModelData;
                        }
                        return updatedModelData;
                    });
                    setIsPlacingCentroids(false);
                    set({ isStepLoading: false, stepError: null });
                    return {
                        ...data,
                        queryPoints: currentModelData?.queryPoints || null,
                    } as unknown as KMeansModelData;
                } else {
                    throw new Error("Step failed");
                }
            } catch (error) {
                console.error("Failed to perform KMeans step:", error);
                set({
                    stepData: null,
                    isStepLoading: false,
                    stepError:
                        error instanceof Error
                            ? error.message
                            : "Unknown error performing KMeans step",
                });
                return null;
            }
        };

        const getFeatureNames = (): string[] | null => {
            const { visualizationData } = get();
            return visualizationData?.metadata?.feature_names || null;
        };

        const getPredictiveFeatureNames = (): string[] | null => {
            const { visualizationData } = get();
            return visualizationData?.visualisation_feature_names || getFeatureNames();
        };

        const getClusterCount = (): number | null => {
            const { visualizationData } = get();
            return visualizationData?.metadata?.n_clusters || null;
        };

        const getClassNames = (): string[] | null => {
            // KMeans doesn't have class names, but we can return cluster IDs as strings
            const clusterCount = getClusterCount();
            if (clusterCount === null) return null;
            return Array.from({ length: clusterCount }, (_, i) => `Cluster ${i}`);
        };

        const getCentroids = (): number[][] | null => {
            const { visualizationData } = get();
            return visualizationData?.final_centroids || null;
        };

        const isVisualizationReady = (): boolean => {
            const { visualizationData } = get();
            return !!(
                visualizationData?.success &&
                visualizationData?.metadata?.feature_names &&
                visualizationData?.final_centroids
            );
        };

        const clearSelectedCentroids = () => {
            setSelectedCentroids([]);
        };

        const makePrediction = async (request: Partial<KMeansPredictRequest>) => {
            set({ isPredictionLoading: true, predictionError: null });
            try {
                const data = await predictAPI(request);
                if (data.success) {
                    set({
                        predictionData: data,
                        isPredictionLoading: false,
                        predictionError: null,
                        queryPoints: request.query_points || null,
                    });
                    // Opt-in: persist query points if desired
                    setCurrentModelData((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  queryPoints: request.query_points || null,
                              }
                            : null,
                    );
                    return data;
                } else {
                    throw new Error("Prediction failed");
                }
            } catch (error) {
                console.error("Failed to make KMeans prediction:", error);
                set({
                    predictionData: null,
                    isPredictionLoading: false,
                    predictionError:
                        error instanceof Error ? error.message : "Unknown error making prediction",
                });
            }
        };

        const predict = async (points: Record<string, number>) => {
            const { lastParams } = get();
            const featureNames = getPredictiveFeatureNames();
            const centroids = getCentroids();
            if (!featureNames || !centroids) return;
            const queryPoint = featureNames.map((name) => points[name] || 0);
            const { feature_1, feature_2, ...paramsForAlgorithm } = lastParams || {};
            await makePrediction({
                query_points: [queryPoint],
                centroids: centroids,
                parameters: {
                    ...paramsForAlgorithm,
                    feature_1: feature_1 ?? 0,
                    feature_2: feature_2 ?? 1,
                } as any,
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
            console.log("[KMeansStore] Resetting model data");
            baseResetModelData();
            // Clear all model-specific local states
            set({
                visualizationError: null,
                stepError: null,
                stepData: null,
                predictionError: null,
                predictionData: null,
                queryPoints: null,
            });
            setSelectedCentroids([]);
            setIsPlacingCentroids(true);
            set({
                isVisualizationLoading: false,
                isStepLoading: false,
                isPredictionLoading: false,
                centroidHistory: [],
            });
        };
        const visualizationData = currentModelData || null;
        const predictionResult: PredictionResult<KMeansPredictionAdditionalData> | null = (() => {
            if (!predictionData || predictionData.assignments?.[0] === undefined) return null;
            const clusterNames = getClassNames();
            const clusterIndex = predictionData.assignments[0];
            return {
                predictedClass: clusterNames?.[clusterIndex] || `Cluster ${clusterIndex}`,
                predictedClassIndex: clusterIndex,
                additionalData: {
                    assignments: predictionData.assignments,
                    distance_matrix: predictionData.distance_matrix,
                    assigned_distances: predictionData.assigned_distances,
                    centroids: predictionData.centroids,
                },
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
            // KMeans-specifics
            isStepLoading,
            stepError,
            stepData,
            performStep,
            isPredictionLoading,
            predictionData,
            queryPoints,
            isVisualizationLoading,
            lastVisualizationParams: lastParams as any,
            makePrediction,
            getClusterCount,
            getCentroids,
            isVisualizationReady,
            // Centroid selection
            selectedCentroids,
            setSelectedCentroids,
            clearSelectedCentroids,
            isPlacingCentroids,
            setIsPlacingCentroids,
            // Centroid trail history
            centroidHistory,
            clearIterationState,
        };
    },
    deriveKMeansState,
);

function deriveKMeansState(state: KMeansStore, previous?: KMeansStore): Partial<KMeansStore> {
    const prediction = state.predictionData;
    const clusterIndex = prediction?.assignments?.[0];
    return {
        data: state.currentModelData,
        visualizationData: state.currentModelData,
        isLoading: state.isVisualizationLoading,
        isVisualizing: state.isVisualizationLoading,
        error: state.visualizationError,
        isPredicting: state.isPredictionLoading,
        lastVisualizationParams: state.lastParams,
        selectedCentroids:
            state.currentModelData?.final_centroids !== previous?.currentModelData?.final_centroids
                ? (state.currentModelData?.final_centroids ?? [])
                : state.selectedCentroids,
        queryPoints:
            state.currentModelData?.queryPoints !== previous?.currentModelData?.queryPoints
                ? (state.currentModelData?.queryPoints ?? null)
                : state.queryPoints,
        predictionResult:
            prediction && clusterIndex !== undefined
                ? {
                      predictedClass: `Cluster ${clusterIndex}`,
                      predictedClassIndex: clusterIndex,
                      additionalData: {
                          assignments: prediction.assignments,
                          distance_matrix: prediction.distance_matrix,
                          assigned_distances: prediction.assigned_distances,
                          centroids: prediction.centroids,
                      },
                  }
                : null,
    };
}
