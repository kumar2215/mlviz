/**
 * Linear Regression Model Context
 * Manages state and API interactions for Linear Regression visualisations.
 * Follows the same pattern as KMeansContext.
 */

import {
    evaluate as evaluateAPI,
    getParameters as getParametersAPI,
    step as stepAPI,
    train as trainAPI,
    visualise as visualiseAPI,
    type LinearRegressionStepRequest,
    type LinearRegressionStepResponse,
    type LinearRegressionTrainRequest,
    type LinearRegressionTrainResponse
} from "@/api/linear_regression";
import { useDataset } from "@/store/useAppStore";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    createBaseModelContext,
    type BaseModelData,
    type PredictableModelContext,
    type PredictionResult,
    type StepableModelContext,
    type TrainableModelContext,
    type VisualizableModelContext,
} from "./BaseModelContext";

// ============================================================================
// Types
// ============================================================================

export interface LinearRegressionModelData
    extends BaseModelData,
        LinearRegressionTrainResponse {}

// Base context instance
const { Provider: BaseProvider, useBaseModel } =
    createBaseModelContext<LinearRegressionModelData>({
        localStorageKey: "linear_regression_model_data",
        paramsStorageKey: "linear_regression_params",
        getParameters: getParametersAPI,
    });

// ============================================================================
// Context Interface
// ============================================================================

interface LinearRegressionContextType
    extends TrainableModelContext<LinearRegressionModelData>,
        VisualizableModelContext<LinearRegressionModelData>,
        StepableModelContext<
            LinearRegressionModelData,
            LinearRegressionStepResponse,
            LinearRegressionStepRequest
        >,
        PredictableModelContext<LinearRegressionModelData, { predicted_y: number }> {
    isVisualizationLoading: boolean;
    visualizationError: string | null;
    visualizationData: LinearRegressionModelData | null;
    lastVisualizationParams: Partial<LinearRegressionTrainRequest>;

    loadVisualization: (
        params?: Partial<LinearRegressionTrainRequest>
    ) => Promise<LinearRegressionModelData | null>;
    train: (
        params?: Partial<LinearRegressionTrainRequest>
    ) => Promise<LinearRegressionModelData | null>;

    // Re-declared to narrow the base Promise<any> to specific types
    isStepLoading: boolean;
    stepError: string | null;
    stepData: LinearRegressionStepResponse | null;
    performStep: (
        request: LinearRegressionStepRequest
    ) => Promise<LinearRegressionStepResponse | null>;

    // Live Evaluation
    isEvaluating: boolean;
    evaluateLine: (slope: number, intercept: number) => Promise<void>;

    // Live line (frontend-owned, slider / HUD driven)
    currentSlope: number;
    currentIntercept: number;
    setCurrentLine: (slope: number, intercept: number) => void;

    /** Compute R² live on the frontend from the scatter points */
    computeR2: (slope: number, intercept: number) => number;
    /** Compute MSE live on the frontend from the scatter points */
    computeMSE: (slope: number, intercept: number) => number;
    /** Randomize the current line based on data range */
    randomizeLine: () => void;
}

const LinearRegressionContext = createContext<
    LinearRegressionContextType | undefined
>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface LinearRegressionProviderProps {
    children: ReactNode;
}

export const LinearRegressionProvider: React.FC<
    LinearRegressionProviderProps
> = ({ children }) => (
    <BaseProvider>
        <LinearRegressionProviderInner>
            {children}
        </LinearRegressionProviderInner>
    </BaseProvider>
);

const LinearRegressionProviderInner: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
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

    const { activeDataset } = useDataset();

    const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);
    const [visualizationError, setVisualizationError] = useState<string | null>(null);

    const [isStepLoading, setIsStepLoading] = useState(false);
    const [stepError, setStepError] = useState<string | null>(null);
    const [stepData, setStepData] = useState<LinearRegressionStepResponse | null>(null);

    const [isEvaluating, setIsEvaluating] = useState(false);

    // Live line — synced to the trained OLS line when training completes
    const [currentSlope, setCurrentSlopeState] = useState<number>(
        currentModelData?.line?.slope ?? 0
    );
    const [currentIntercept, setCurrentInterceptState] = useState<number>(
        currentModelData?.line?.intercept ?? 0
    );

    useEffect(() => {
        if (currentModelData?.line) {
            setCurrentSlopeState(currentModelData.line.slope ?? 0);
            setCurrentInterceptState(currentModelData.line.intercept ?? 0);
        }
    }, [currentModelData?.line?.slope, currentModelData?.line?.intercept]);

    const setCurrentLine = useCallback((slope: number, intercept: number) => {
        setCurrentSlopeState(slope);
        setCurrentInterceptState(intercept);
    }, []);

    // Prediction
    const [isPredicting, setIsPredicting] = useState(false);
    const [predictionResult, setPredictionResult] = useState<PredictionResult<{ predicted_y: number }> | null>(null);

    const getFeatureNames = useCallback((): string[] | null => {
        const name = currentModelData?.metadata?.feature_x_name;
        return name ? [name] : null;
    }, [currentModelData?.metadata?.feature_x_name]);

    const getClassNames = useCallback((): string[] | null => {
        const name = currentModelData?.metadata?.target_name;
        return name ? [name] : null;
    }, [currentModelData?.metadata?.target_name]);

    const predict = useCallback(async (points: Record<string, number>) => {
        setIsPredicting(true);
        const featureName = currentModelData?.metadata?.feature_x_name ?? "x";
        const x = points[featureName] ?? 0;
        const y = currentSlope * x + currentIntercept;
        setPredictionResult({
            predictedClass: String(y.toFixed(4)),
            predictedClassIndex: 0,
            additionalData: { predicted_y: y },
        });
        setIsPredicting(false);
    }, [currentModelData?.metadata?.feature_x_name, currentSlope, currentIntercept]);

    const clearPrediction = useCallback(() => {
        setPredictionResult(null);
    }, []);

    const randomizeLine = useCallback(() => {
        if (!currentModelData) {
            setCurrentSlopeState(Math.random() * 2 - 1);
            setCurrentInterceptState(Math.random() * 20 - 10);
            return;
        }
        
        const xRange = currentModelData.x_range as [number, number];
        const yRange = currentModelData.y_range as [number, number];
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        
        // Random slope between -ySpan/xSpan and ySpan/xSpan
        const randomSlope = (Math.random() * 2 - 1) * (ySpan / xSpan);
        // Random intercept within the y range
        const randomIntercept = yRange[0] + Math.random() * ySpan;
        
        setCurrentSlopeState(randomSlope);
        setCurrentInterceptState(randomIntercept);
    }, [currentModelData]);

    // ========================================================================
    // Frontend R² computation (no API round-trip)
    // ========================================================================
    const computeR2 = useCallback(
        (slope: number, intercept: number): number => {
            const points = currentModelData?.points;
            if (!points || points.length === 0) return 0;
            const yMean = points.reduce((s, p) => s + p[1], 0) / points.length;
            const ssTot = points.reduce((s, p) => s + (p[1] - yMean) ** 2, 0);
            if (ssTot === 0) return 1;
            const ssRes = points.reduce(
                (s, p) => s + (p[1] - (slope * p[0] + intercept)) ** 2,
                0
            );
            return 1 - ssRes / ssTot;
        },
        [currentModelData?.points]
    );

    const computeMSE = useCallback(
        (slope: number, intercept: number): number => {
            const points = currentModelData?.points;
            if (!points || points.length === 0) return 0;
            return points.reduce(
                (s, p) => s + (p[1] - (slope * p[0] + intercept)) ** 2,
                0
            ) / points.length;
        },
        [currentModelData?.points]
    );

    // ========================================================================
    // Visualise (scatter only, no fitting)
    // ========================================================================

    const loadVisualization = useCallback(
        async (
            params?: Partial<LinearRegressionTrainRequest>
        ): Promise<LinearRegressionModelData | null> => {
            setIsVisualizationLoading(true);
            setVisualizationError(null);
            try {
                const featureX =
                    (params as any)?.feature_x ??
                    (params?.parameters as any)?.feature_x ??
                    0;

                const data = await visualiseAPI({
                    parameters: {
                        feature_x: featureX,
                        fit_intercept: true,
                        test_size: 0.2,
                        random_state: 42,
                        learning_rate: 0.01,
                    },
                    dataset: (params as any)?.dataset || activeDataset || undefined,
                });

                // Wrap visualise response into the full model-data shape
                const modelData: LinearRegressionModelData = {
                    ...data,
                    line: { slope: 0, intercept: 0 },
                    metrics: {
                        train: { r2: 0, mse: 0, rmse: 0, mae: 0 },
                        test: { r2: 0, mse: 0, rmse: 0, mae: 0 }
                    }
                } as unknown as LinearRegressionModelData;

                setCurrentModelData(modelData);
                
                // Randomize line on initial load
                const xRange = modelData.x_range as [number, number];
                const yRange = modelData.y_range as [number, number];
                const xSpan = xRange[1] - xRange[0];
                const ySpan = yRange[1] - yRange[0];
                const randomSlope = (Math.random() * 2 - 1) * (ySpan / xSpan);
                const randomIntercept = yRange[0] + Math.random() * ySpan;
                setCurrentSlopeState(randomSlope);
                setCurrentInterceptState(randomIntercept);

                setLastParams(params ?? {});
                setIsVisualizationLoading(false);
                return modelData;
            } catch (error) {
                console.error("[LinearRegressionContext] visualise error:", error);
                setVisualizationError(
                    error instanceof Error ? error.message : "Unknown error"
                );
                setIsVisualizationLoading(false);
                return null;
            }
        },
        [activeDataset, setCurrentModelData, setLastParams]
    );

    // ========================================================================
    // Train (OLS fit)
    // ========================================================================

    const trainModel = useCallback(
        async (
            params?: Partial<LinearRegressionTrainRequest>
        ): Promise<LinearRegressionModelData | null> => {
            setIsVisualizationLoading(true);
            setVisualizationError(null);
            try {
                // Flatten any nested parameter shapes coming from the sidebar
                const flat = (params as any) ?? {};
                const nested = flat?.parameters ?? {};

                const data = await trainAPI({
                    parameters: {
                        feature_x: flat.feature_x ?? nested.feature_x ?? 0,
                        fit_intercept: flat.fit_intercept ?? nested.fit_intercept ?? true,
                        test_size: flat.test_size ?? nested.test_size ?? 0.2,
                        random_state: flat.random_state ?? nested.random_state ?? 42,
                        learning_rate: flat.learning_rate ?? nested.learning_rate ?? 0.01,
                    },
                    dataset: flat.dataset || activeDataset || undefined,
                });

                const modelData = data as unknown as LinearRegressionModelData;
                setCurrentModelData(modelData);
                setCurrentSlopeState(data.line.slope ?? 0);
                setCurrentInterceptState(data.line.intercept ?? 0);
                setLastParams(params ?? {});
                setIsVisualizationLoading(false);
                return modelData;
            } catch (error) {
                console.error("[LinearRegressionContext] train error:", error);
                setVisualizationError(
                    error instanceof Error ? error.message : "Unknown error training"
                );
                setIsVisualizationLoading(false);
                return null;
            }
        },
        [activeDataset, setCurrentModelData, setLastParams]
    );

    // ========================================================================
    // Step (single gradient descent iteration)
    // ========================================================================

    const performStep = useCallback(
        async (
            request: LinearRegressionStepRequest
        ): Promise<LinearRegressionStepResponse | null> => {
            setIsStepLoading(true);
            setStepError(null);
            try {
                const data = await stepAPI(request);
                setStepData(data);
                setIsStepLoading(false);
                return data;
            } catch (error) {
                console.error("[LinearRegressionContext] step error:", error);
                setStepError(
                    error instanceof Error ? error.message : "Unknown error in step"
                );
                setIsStepLoading(false);
                return null;
            }
        },
        []
    );

    // ========================================================================
    // Evaluate (Canonical metrics for any line)
    // ========================================================================

    const evaluateLine = useCallback(
        async (slope: number, intercept: number) => {
            if (!currentModelData?.points) return;
            setIsEvaluating(true);
            try {
                const response = await evaluateAPI({
                    slope,
                    intercept,
                    points: currentModelData.points,
                });
                
                // Update currentModelData.metrics directly so sidebar updates
                setCurrentModelData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        metrics: response.metrics,
                    };
                });
            } catch (err) {
                console.error("[LinearRegressionContext] evaluate error:", err);
            } finally {
                setIsEvaluating(false);
            }
        },
        [currentModelData?.points]
    );

    // ========================================================================
    // Auto-load on mount
    // ========================================================================

    const autoLoadAttempted = useRef(false);
    useEffect(() => {
        if (
            !autoLoadAttempted.current &&
            !currentModelData &&
            !isVisualizationLoading &&
            lastParams
        ) {
            autoLoadAttempted.current = true;
            loadVisualization(lastParams);
        }
    }, [currentModelData, isVisualizationLoading, lastParams, loadVisualization]);

    // ========================================================================
    // Reset
    // ========================================================================

    const resetModelData = useCallback(() => {
        baseResetModelData();
        setVisualizationError(null);
        setStepData(null);
        setStepError(null);
        setIsVisualizationLoading(false);
        setIsStepLoading(false);
        setCurrentSlopeState(Math.random() * 2 - 1);
        setCurrentInterceptState(Math.random() * 20 - 10);
    }, [baseResetModelData]);

    // ========================================================================
    // Context value
    // ========================================================================

    const visualizationData = currentModelData ?? null;

    const contextValue: LinearRegressionContextType = React.useMemo(
        () => ({
            currentModelData,
            lastParams,
            setCurrentModelData,
            setLastParams,
            resetModelData,
            getLastParams,
            getParameters,

            isLoading: isVisualizationLoading,
            error: visualizationError,
            data: currentModelData,
            train: trainModel,

            isVisualizing: isVisualizationLoading,
            visualizationError,
            visualizationData,
            loadVisualization,
            isVisualizationLoading,
            lastVisualizationParams: lastParams as any,

            isStepLoading,
            stepError,
            stepData,
            performStep,

            currentSlope,
            currentIntercept,
            setCurrentLine,
            computeR2,
            computeMSE,

            isEvaluating,
            evaluateLine,
            randomizeLine,

            getFeatureNames,
            getClassNames,
            isPredicting,
            predictionError: null,
            predictionResult,
            predict,
            clearPrediction,
        }),
        [
            currentModelData, lastParams, setCurrentModelData, setLastParams,
            resetModelData, getLastParams, getParameters,
            isVisualizationLoading, visualizationError, trainModel,
            visualizationData, loadVisualization,
            isStepLoading, stepError, stepData, performStep,
            currentSlope, currentIntercept, setCurrentLine, computeR2, computeMSE,
            isEvaluating, evaluateLine, randomizeLine,
            getFeatureNames, getClassNames, isPredicting, predictionResult, predict, clearPrediction,
        ]
    );

    return (
        <LinearRegressionContext.Provider value={contextValue}>
            {children}
        </LinearRegressionContext.Provider>
    );
};

// ============================================================================
// Hook
// ============================================================================

export const useLinearRegression = () => {
    const context = useContext(LinearRegressionContext);
    if (context === undefined) {
        throw new Error(
            "useLinearRegression must be used within a LinearRegressionProvider"
        );
    }
    return context;
};
