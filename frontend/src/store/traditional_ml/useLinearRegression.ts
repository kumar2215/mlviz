import {
    evaluate as evaluateAPI,
    getParameters as getParametersAPI,
    step as stepAPI,
    train as trainAPI,
    visualise as visualiseAPI,
    type LinearRegressionStepRequest,
    type LinearRegressionStepResponse,
    type LinearRegressionTrainRequest,
    type LinearRegressionTrainResponse,
} from "@/api/linear_regression";
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

// ============================================================================
// Types
// ============================================================================
export interface LinearRegressionModelData extends BaseModelData, LinearRegressionTrainResponse {}

// ============================================================================
// Store Interface
// ============================================================================
interface LinearRegressionStore
    extends TrainableModelState<LinearRegressionModelData>,
        VisualizableModelState<LinearRegressionModelData>,
        StepableModelState<
            LinearRegressionModelData,
            LinearRegressionStepResponse,
            LinearRegressionStepRequest
        >,
        PredictableModelState<
            LinearRegressionModelData,
            {
                predicted_y: number;
            }
        > {
    isVisualizationLoading: boolean;
    visualizationError: string | null;
    visualizationData: LinearRegressionModelData | null;
    lastVisualizationParams: Partial<LinearRegressionTrainRequest>;
    loadVisualization: (
        params?: Partial<LinearRegressionTrainRequest>,
    ) => Promise<LinearRegressionModelData | null>;
    train: (
        params?: Partial<LinearRegressionTrainRequest>,
    ) => Promise<LinearRegressionModelData | null>;
    // Re-declared to narrow the base Promise<any> to specific types
    isStepLoading: boolean;
    stepError: string | null;
    stepData: LinearRegressionStepResponse | null;
    performStep: (
        request: LinearRegressionStepRequest,
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

export const useLinearRegression = createBaseModelStore<
    LinearRegressionModelData,
    LinearRegressionStore
>(
    {
        localStorageKey: "linear_regression_model_data",
        paramsStorageKey: "linear_regression_params",
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
        const stepData = null as LinearRegressionStepResponse | null;
        const isEvaluating = false;
        const currentSlope = (currentModelData?.line?.slope ?? 0) as number;
        const currentIntercept = (currentModelData?.line?.intercept ?? 0) as number;
        const isPredicting = false;
        const predictionResult = null as PredictionResult<{
            predicted_y: number;
        }> | null;

        const setCurrentLine = (slope: number, intercept: number) => {
            set({ currentSlope: slope, currentIntercept: intercept });
        };

        const getFeatureNames = (): string[] | null => {
            const { currentModelData } = get();
            const name = currentModelData?.metadata?.feature_x_name;
            return name ? [name] : null;
        };

        const getClassNames = (): string[] | null => {
            const { currentModelData } = get();
            const name = currentModelData?.metadata?.target_name;
            return name ? [name] : null;
        };

        const predict = async (points: Record<string, number>) => {
            const { currentModelData, currentSlope, currentIntercept } = get();
            set({ isPredicting: true });
            const featureName = currentModelData?.metadata?.feature_x_name ?? "x";
            const x = points[featureName] ?? 0;
            const y = currentSlope * x + currentIntercept;
            set({
                predictionResult: {
                    predictedClass: String(y.toFixed(4)),
                    predictedClassIndex: 0,
                    additionalData: { predicted_y: y },
                },
                isPredicting: false,
            });
        };

        const clearPrediction = () => {
            set({ predictionResult: null });
        };

        const randomizeLine = () => {
            const { currentModelData } = get();
            if (!currentModelData) {
                set({
                    currentSlope: Math.random() * 2 - 1,
                    currentIntercept: Math.random() * 20 - 10,
                });
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
            set({ currentSlope: randomSlope, currentIntercept: randomIntercept });
        };

        const computeR2 = (slope: number, intercept: number): number => {
            const { currentModelData } = get();
            const points = currentModelData?.points;
            if (!points || points.length === 0) return 0;
            const yMean = points.reduce((s, p) => s + p[1], 0) / points.length;
            const ssTot = points.reduce((s, p) => s + (p[1] - yMean) ** 2, 0);
            if (ssTot === 0) return 1;
            const ssRes = points.reduce((s, p) => s + (p[1] - (slope * p[0] + intercept)) ** 2, 0);
            return 1 - ssRes / ssTot;
        };

        const computeMSE = (slope: number, intercept: number): number => {
            const { currentModelData } = get();
            const points = currentModelData?.points;
            if (!points || points.length === 0) return 0;
            return (
                points.reduce((s, p) => s + (p[1] - (slope * p[0] + intercept)) ** 2, 0) /
                points.length
            );
        };

        const loadVisualization = async (
            params?: Partial<LinearRegressionTrainRequest>,
        ): Promise<LinearRegressionModelData | null> => {
            const { activeDataset } = useDataset.getState();
            set({ isVisualizationLoading: true, visualizationError: null });
            try {
                const featureX =
                    (params as any)?.feature_x ?? (params?.parameters as any)?.feature_x ?? 0;
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
                        test: { r2: 0, mse: 0, rmse: 0, mae: 0 },
                    },
                } as unknown as LinearRegressionModelData;
                setCurrentModelData(modelData);
                // Randomize line on initial load
                const xRange = modelData.x_range as [number, number];
                const yRange = modelData.y_range as [number, number];
                const xSpan = xRange[1] - xRange[0];
                const ySpan = yRange[1] - yRange[0];
                const randomSlope = (Math.random() * 2 - 1) * (ySpan / xSpan);
                const randomIntercept = yRange[0] + Math.random() * ySpan;
                set({ currentSlope: randomSlope, currentIntercept: randomIntercept });
                setLastParams(params ?? {});
                set({ isVisualizationLoading: false });
                return modelData;
            } catch (error) {
                console.error("[LinearRegressionStore] visualise error:", error);
                set({
                    visualizationError: error instanceof Error ? error.message : "Unknown error",
                    isVisualizationLoading: false,
                });
                return null;
            }
        };

        const trainModel = async (
            params?: Partial<LinearRegressionTrainRequest>,
        ): Promise<LinearRegressionModelData | null> => {
            const { activeDataset } = useDataset.getState();
            set({ isVisualizationLoading: true, visualizationError: null });
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
                set({
                    currentSlope: data.line.slope ?? 0,
                    currentIntercept: data.line.intercept ?? 0,
                });
                setLastParams(params ?? {});
                set({ isVisualizationLoading: false });
                return modelData;
            } catch (error) {
                console.error("[LinearRegressionStore] train error:", error);
                set({
                    visualizationError:
                        error instanceof Error ? error.message : "Unknown error training",
                    isVisualizationLoading: false,
                });
                return null;
            }
        };

        const performStep = async (
            request: LinearRegressionStepRequest,
        ): Promise<LinearRegressionStepResponse | null> => {
            set({ isStepLoading: true, stepError: null });
            try {
                const data = await stepAPI(request);
                set({ stepData: data, isStepLoading: false });
                return data;
            } catch (error) {
                console.error("[LinearRegressionStore] step error:", error);
                set({
                    stepError: error instanceof Error ? error.message : "Unknown error in step",
                    isStepLoading: false,
                });
                return null;
            }
        };

        const evaluateLine = async (slope: number, intercept: number) => {
            const { currentModelData } = get();
            if (!currentModelData?.points) return;
            set({ isEvaluating: true });
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
                console.error("[LinearRegressionStore] evaluate error:", err);
            } finally {
                set({ isEvaluating: false });
            }
        };

        const resetModelData = () => {
            baseResetModelData();
            set({
                visualizationError: null,
                stepData: null,
                stepError: null,
                isVisualizationLoading: false,
                isStepLoading: false,
                currentSlope: Math.random() * 2 - 1,
                currentIntercept: Math.random() * 20 - 10,
            });
        };
        const visualizationData = currentModelData ?? null;
        return {
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
        };
    },
    deriveLinearRegressionState,
);

function deriveLinearRegressionState(
    state: LinearRegressionStore,
    previous?: LinearRegressionStore,
): Partial<LinearRegressionStore> {
    const line = state.currentModelData?.line;
    const previousLine = previous?.currentModelData?.line;
    const lineChanged =
        line && (line.slope !== previousLine?.slope || line.intercept !== previousLine?.intercept);
    return {
        data: state.currentModelData,
        visualizationData: state.currentModelData,
        isLoading: state.isVisualizationLoading,
        isVisualizing: state.isVisualizationLoading,
        error: state.visualizationError,
        lastVisualizationParams: state.lastParams,
        currentSlope: lineChanged ? (line.slope ?? 0) : state.currentSlope,
        currentIntercept: lineChanged ? (line.intercept ?? 0) : state.currentIntercept,
    };
}
