/**
 * KNN Model Context
 * Manages state and API interactions for KNN visualizations
 * Follows the same pattern as ModelContext (Decision Tree)
 */

import {
    getParameters as getParametersAPI,
    getVisualisation,
    predict as predictAPI,
    train as trainKNN,
    type KNNPredictionRequest,
    type KNNPredictionResponse,
    type KNNTrainingRequest,
    type KNNVisualisationRequest,
    type KNNVisualisationResponse,
} from "@/api/knn";
import { useDataset } from "@/contexts/DatasetContext";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    type ReactNode,
} from "react";
import {
    createBaseModelContext,
    type BaseModelData,
    type PredictableModelContext,
    type PredictionResult,
    type TrainableModelContext,
    type VisualizableModelContext,
} from "./BaseModelContext";

// Define comprehensive KNN model data type
interface KNNModelData extends BaseModelData, KNNVisualisationResponse {
    // Persisted query points (optional)
    queryPoints: number[][] | null;
}

// Create base context instance for KNN
const { Provider: BaseProvider, useBaseModel } =
    createBaseModelContext<KNNModelData>({
        localStorageKey: "knn_model_data",
        paramsStorageKey: "knn_params",
        getParameters: getParametersAPI,
    });

// ============================================================================
// Types
// ============================================================================

interface KNNContextType
    extends
        TrainableModelContext<KNNModelData>,
        PredictableModelContext<KNNModelData, KNNPredictionResponse>,
        VisualizableModelContext<KNNModelData> {
    // KNN-specific properties (backward compatibility or specialized)

    // Prediction state (Original names)
    isPredictionLoading: boolean;
    predictionError: string | null;
    predictionData: KNNPredictionResponse | null;
    queryPoints: number[][] | null;

    // Visualization state (Original names)
    isVisualizationLoading: boolean;
    visualizationError: string | null;
    visualizationData: KNNModelData | null;
    lastVisualizationParams: Partial<KNNVisualisationRequest>;

    // Specialized methods
    makePrediction: (request: Partial<KNNPredictionRequest>) => Promise<void>;
    getK: () => number | null;
    isVisualizationReady: () => boolean;
}

const KNNContext = createContext<KNNContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface KNNProviderProps {
    children: ReactNode;
}

export const KNNProvider: React.FC<KNNProviderProps> = ({ children }) => {
    return (
        <BaseProvider>
            <KNNProviderInner>{children}</KNNProviderInner>
        </BaseProvider>
    );
};

const KNNProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
    const baseContext = useBaseModel();
    const {
        currentModelData,
        lastParams,
        setCurrentModelData,
        setLastParams,
        resetModelData: baseResetModelData,
        getLastParams,
        getParameters,
    } = baseContext;

    // Access the active dataset from DatasetContext
    const { activeDataset } = useDataset();

    // Extract values from currentModelData or use defaults
    const [isVisualizationLoading, setIsVisualizationLoading] =
        React.useState<boolean>(false);
    const [visualizationError, setVisualizationError] = React.useState<
        string | null
    >(null);

    // For backward compatibility and specialized use
    const visualizationData = currentModelData || null;

    // Prediction state (Local to avoid infinite loops with persisted state)
    const [isPredictionLoading, setIsPredictionLoading] =
        React.useState<boolean>(false);
    const [predictionError, setPredictionError] = React.useState<string | null>(
        null,
    );
    const [predictionData, setPredictionData] =
        React.useState<KNNPredictionResponse | null>(null);
    const [queryPoints, setQueryPoints] = React.useState<number[][] | null>(
        currentModelData?.queryPoints || null,
    );

    // Sync queryPoints from currentModelData if needed
    useEffect(() => {
        if (currentModelData?.queryPoints) {
            setQueryPoints(currentModelData.queryPoints);
        }
    }, [currentModelData?.queryPoints]);

    // ========================================================================
    // Visualization Methods
    // ========================================================================

    const loadVisualization = useCallback(
        async (request: Partial<KNNVisualisationRequest> = {}) => {
            // Update loading state
            setIsVisualizationLoading(true);
            setVisualizationError(null);

            try {
                const requestWithDataset = {
                    ...request,
                    dataset: request.dataset || activeDataset || undefined,
                };
                const data = await getVisualisation(requestWithDataset);
                if (data.success) {
                    setCurrentModelData({
                        ...data,
                        queryPoints: currentModelData?.queryPoints || null,
                    });
                    setIsVisualizationLoading(false);
                    setVisualizationError(null);
                    setLastParams(request);
                } else {
                    throw new Error(
                        "Visualization failed - API returned success: false",
                    );
                }
            } catch (error) {
                console.error("Failed to load KNN visualization:", error);
                setIsVisualizationLoading(false);
                setVisualizationError(
                    error instanceof Error
                        ? error.message
                        : "Unknown error loading visualization",
                );
            }
        },
        [currentModelData, setCurrentModelData, setLastParams, activeDataset],
    );

    // ========================================================================
    // Training (with metrics)
    // ========================================================================

    const trainModel = useCallback(
        async (params?: Partial<KNNVisualisationRequest>) => {
            // Structure the request properly - params should go in the parameters field
            const request: Partial<KNNTrainingRequest> = {
                parameters: params as any, // params contains the KNN parameters (n_neighbors, feature_1, etc.)
            };

            setIsVisualizationLoading(true);
            setVisualizationError(null);

            try {
                const requestWithDataset = {
                    ...request,
                    dataset: request.dataset || activeDataset || undefined,
                };
                const data = await trainKNN(requestWithDataset);

                if (data.success) {
                    console.log("Training successful:", data);
                    setCurrentModelData({
                        ...data,
                        queryPoints: null,
                    });
                    setIsVisualizationLoading(false);
                    setVisualizationError(null);
                    setLastParams(params || {});
                }
                console.log("Current model data: ", currentModelData);
            } catch (error) {
                console.error("Error training KNN:", error);
                setIsVisualizationLoading(false);
                setVisualizationError(
                    error instanceof Error
                        ? error.message
                        : "Unknown error training KNN",
                );
            }
        },
        [setCurrentModelData, setLastParams, activeDataset],
    );

    // ========================================================================
    // Helper Methods
    // ========================================================================

    const getFeatureNames = useCallback((): string[] | null => {
        return (
            visualizationData?.metadata?.feature_names ||
            predictionData?.feature_names ||
            null
        );
    }, [visualizationData, predictionData]);

    const getPredictiveFeatureNames = useCallback((): string[] | null => {
        return (
            visualizationData?.visualisation_feature_names || getFeatureNames()
        );
    }, [visualizationData, getFeatureNames]);

    const getClassNames = useCallback((): string[] | null => {
        return (
            visualizationData?.metadata?.class_names ||
            predictionData?.class_names ||
            null
        );
    }, [visualizationData, predictionData]);

    const getK = useCallback((): number | null => {
        if (predictionData?.neighbors_info?.[0]) {
            return predictionData.neighbors_info[0].length;
        }
        return lastParams?.parameters?.n_neighbors || null;
    }, [predictionData, lastParams]);

    const isVisualizationReady = useCallback((): boolean => {
        return !!(
            visualizationData?.success &&
            visualizationData?.metadata?.feature_names &&
            visualizationData?.metadata?.class_names
        );
    }, [visualizationData]);

    // ========================================================================
    // Prediction Methods
    // ========================================================================

    const makePrediction = useCallback(
        async (request: Partial<KNNPredictionRequest>) => {
            setIsPredictionLoading(true);
            setPredictionError(null);

            try {
                const requestWithDataset = {
                    ...request,
                    dataset: request.dataset || activeDataset || undefined,
                };
                const data = await predictAPI(requestWithDataset);

                if (data.success) {
                    setPredictionData(data);
                    setIsPredictionLoading(false);
                    setPredictionError(null);
                    setQueryPoints(request.query_points || null);

                    // Opt-in: persist query points if desired
                    if (currentModelData) {
                        setCurrentModelData({
                            ...currentModelData,
                            queryPoints: request.query_points || null,
                        });
                    }
                } else {
                    throw new Error(
                        "Prediction failed - API returned success: false",
                    );
                }
            } catch (error) {
                console.error("Failed to make KNN prediction:", error);
                setPredictionData(null);
                setIsPredictionLoading(false);
                setPredictionError(
                    error instanceof Error
                        ? error.message
                        : "Unknown error making prediction",
                );
            }
        },
        [currentModelData, setCurrentModelData, activeDataset],
    );

    const predict = useCallback(
        async (points: Record<string, number>) => {
            const featureNames = getFeatureNames();
            if (!featureNames) return;

            // Convert points object to array format expected by API
            const queryPoint = featureNames.map((name) => points[name] || 0);

            await makePrediction({
                query_points: [queryPoint],
                visualisation_features:
                    visualizationData?.visualisation_feature_indices ||
                    undefined,
            });
        },
        [getFeatureNames, makePrediction, visualizationData],
    );

    const clearPrediction = useCallback(() => {
        setPredictionData(null);
        setPredictionError(null);
        setIsPredictionLoading(false);
        setQueryPoints(null);

        // Also clear persisted query points
        if (currentModelData) {
            setCurrentModelData({
                ...currentModelData,
                queryPoints: null,
            });
        }
    }, [currentModelData, setCurrentModelData]);

    // ========================================================================
    // Auto-load on mount
    // ========================================================================

    const autoLoadAttempted = useRef(false);

    useEffect(() => {
        if (
            !autoLoadAttempted.current &&
            !visualizationData &&
            !isVisualizationLoading &&
            lastParams &&
            Object.keys(lastParams).length > 0
        ) {
            autoLoadAttempted.current = true;
            loadVisualization(lastParams);
        }
    }, []); // Only run on mount

    const resetModelData = useCallback(() => {
        console.log("[KNNContext] Resetting model data");
        baseResetModelData();
    }, [baseResetModelData]);

    // ========================================================================
    // Context Value
    // ========================================================================

    const predictionResult: PredictionResult<KNNPredictionResponse> | null =
        React.useMemo(() => {
            if (!predictionData || !predictionData.predictions?.[0])
                return null;

            return {
                predictedClass: predictionData.predictions[0],
                predictedClassIndex:
                    predictionData.prediction_indices?.[0] ?? -1,
                // confidence is optional but KNN doesn't naturally provide it without extra work
                additionalData: predictionData,
            };
        }, [predictionData]);

    const contextValue: KNNContextType = React.useMemo(() => ({
        // BaseModelContextType
        currentModelData,
        lastParams,
        setCurrentModelData,
        setLastParams,
        resetModelData,
        getLastParams,
        getParameters,

        // TrainableModelContext
        isLoading: isVisualizationLoading,
        error: visualizationError,
        data: currentModelData,
        train: trainModel,

        // PredictableModelContext
        isPredicting: isPredictionLoading,
        predictionError,
        predictionResult,
        predict,
        clearPrediction,
        getFeatureNames,
        getClassNames,
        getPredictiveFeatureNames,

        // VisualizableModelContext
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
    }), [
        currentModelData, lastParams, setCurrentModelData, setLastParams, resetModelData, getLastParams, getParameters,
        isVisualizationLoading, visualizationError, trainModel,
        isPredictionLoading, predictionError, predictionResult, predict, clearPrediction,
        getFeatureNames, getClassNames, getPredictiveFeatureNames,
        loadVisualization, predictionData, queryPoints,
        makePrediction, getK, isVisualizationReady
    ]);

    return (
        <KNNContext.Provider value={contextValue}>
            {children}
        </KNNContext.Provider>
    );
};

// ============================================================================
// Hook
// ============================================================================

export const useKNN = () => {
    const context = useContext(KNNContext);
    if (context === undefined) {
        throw new Error("useKNN must be used within a KNNProvider");
    }
    return context;
};
