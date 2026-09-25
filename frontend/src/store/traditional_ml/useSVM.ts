import {
    getParameters,
    getSVMPrediction,
    trainSVM,
    stepSVM,
    type SVMPredictRequest,
    type SVMPredictResponse,
    type SVMTrainRequest,
    type SVMTrainResponse,
    type SVMStepRequest,
    type SVMStepResponse,
} from "@/api/svm";
import type { DecisionBoundary } from "@/components/plots/types";
import {
    createBaseModelStore,
    type BaseModelData,
    type PredictableModelState,
    type PredictionResult,
    type TrainableModelState,
    type VisualizableModelState,
} from "@/store/createBaseModelStore";

/**
 * SVM Model Store
 * Manages state and API interactions for Support Vector Machine classification visualizations
 */
interface SVMModelData extends BaseModelData, SVMTrainResponse {}

interface SVMStore
    extends TrainableModelState<SVMModelData>,
        VisualizableModelState<SVMModelData>,
        PredictableModelState<SVMModelData, SVMPredictResponse> {
    singlePointPrediction: {
        predictedClass: string;
        predictedClassIndex: number;
    } | null;
    // SVM-specific properties
    currentW1: number;
    currentW2: number;
    currentBias: number;
    predictionData: SVMPredictResponse | null;
    // Step state
    isStepLoading: boolean;
    stepData: SVMStepResponse | null;
    performStep: (request: Partial<SVMStepRequest>) => Promise<SVMStepResponse | undefined>;
    iterations: Array<{
        iteration: number;
        w1: number;
        w2: number;
        b: number;
        loss: number;
        mesh_predictions?: string[];
        support_vector_indices?: number[];
        alphas?: number[];
        optimised_points?: number[];
    }>;
    // Visualization Aliases
    isVisualizationLoading: boolean;
    lastVisualizationParams: Partial<SVMTrainRequest>;
    decisionBoundary: DecisionBoundary | null;
    // Prediction extension (inherited from PredictableModelState)
    isPredicting: boolean;
    predictionError: string | null;
    predictionResult: PredictionResult<SVMPredictResponse> | null;
    // Actions
    makePrediction: (
        request: Partial<SVMPredictRequest>,
    ) => Promise<SVMPredictResponse | undefined>;
    setManualWeights: (w1: number, w2: number, b: number) => void;
    randomizeWeights: () => void;
    computeHingeLoss: (w1: number, w2: number, b: number) => number;
}

export const useSVM = createBaseModelStore<SVMModelData, SVMStore>(
    {
        localStorageKey: "svm_model_data",
        paramsStorageKey: "svm_params",
        getParameters,
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
        const isLoading = false;
        const error = null as string | null;
        const isVisualizing = false;
        const visualizationError = null as string | null;
        const isPredicting = false;
        const predictionError = null as string | null;
        const isStepLoading = false;
        const stepData = null as SVMStepResponse | null;
        const currentW1 = 0 as number;
        const currentW2 = 1 as number;
        const currentBias = 0 as number;
        const predictionData = null as SVMPredictResponse | null;
        const singlePointPrediction = null as {
            predictedClass: string;
            predictedClassIndex: number;
        } | null;
        const iterations = [] as Array<{
            iteration: number;
            w1: number;
            w2: number;
            b: number;
            loss: number;
            mesh_predictions?: string[];
            support_vector_indices?: number[];
            alphas?: number[];
            optimised_points?: number[];
        }>;

        const mapDecisionBoundary = (boundary: any): DecisionBoundary | null => {
            if (!boundary) return null;
            return {
                type: "classification",
                meshPoints: boundary.mesh_points || boundary.meshPoints,
                predictions: boundary.predictions,
                dimensions: boundary.dimensions,
            };
        };

        const randomizeWeights = () => {
            set({
                currentW1: Math.random() * 2 - 1,
                currentW2: Math.random() * 2 - 1,
                currentBias: Math.random() * 2 - 1,
                predictionData: null,
            });
        };

        const setManualWeights = (w1: number, w2: number, b: number) => {
            set({ currentW1: w1, currentW2: w2, currentBias: b });
        };

        const computeHingeLoss = (w1: number, w2: number, b: number) => {
            const { currentModelData } = get();
            if (!currentModelData?.points || !currentModelData?.labels) return 0;
            let loss = 0;
            for (let i = 0; i < currentModelData.points.length; i++) {
                const pt = currentModelData.points[i];
                const y_01 = currentModelData.labels[i];
                // SVM uses y in {-1, 1} for loss calculation
                const y_svm = y_01 === 0 ? -1 : 1;
                const margin = y_svm * (w1 * pt[0] + w2 * pt[1] + b);
                loss += Math.max(0, 1 - margin);
            }
            return loss / currentModelData.points.length;
        };

        const train = async (params: Partial<SVMTrainRequest>): Promise<SVMModelData | null> => {
            try {
                set({ isLoading: true, error: null });
                setLastParams(params);
                const {
                    dataset,
                    boundary_resolution,
                    parameters: existingParameters,
                    ...flatParams
                } = params as any;
                const request: Partial<SVMTrainRequest> = {
                    parameters:
                        Object.keys(flatParams).length > 0
                            ? { ...existingParameters, ...flatParams }
                            : existingParameters,
                    dataset,
                    boundary_resolution,
                };
                const result = await trainSVM(request);
                // Extract iterations and strip them from the persisted model data
                // to avoid exceeding the localStorage quota.
                const { iterations: resultIterations, ...resultWithoutIterations } = result as any;
                set({ iterations: resultIterations ?? [] });
                const modelData: SVMModelData = {
                    ...resultWithoutIterations,
                    metrics: result.metrics,
                    metadata: {
                        ...((result.metadata as any) || {}),
                        model_name: "svm",
                        problem_type: "classification",
                        dataset_name:
                            typeof params.dataset === "string"
                                ? params.dataset
                                : (params.dataset as any)?.info?.name || "Unknown",
                    } as any,
                };
                setCurrentModelData(modelData);
                set({ isLoading: false });
                return modelData;
            } catch (error) {
                console.error("Error training SVM:", error);
                set({
                    error: error instanceof Error ? error.message : "Unknown error training SVM",
                    isLoading: false,
                });
                return null;
            }
        };

        const performStep = async (
            request: Partial<SVMStepRequest>,
        ): Promise<SVMStepResponse | undefined> => {
            try {
                set({ isStepLoading: true });
                const result = await stepSVM(request);
                set({ stepData: result });
                return result;
            } catch (error) {
                console.error("Error stepping SVM:", error);
            } finally {
                set({ isStepLoading: false });
            }
        };

        const loadVisualization = async (
            params?: Partial<SVMTrainRequest>,
        ): Promise<SVMModelData | null> => {
            set({ isVisualizing: true, visualizationError: null });
            const res = await train(params || {});
            // Mirror training errors to visualization errors
            if (!res) set({ visualizationError: "Error visualising SVM" });
            set({ isVisualizing: false });
            return res;
        };

        const makePrediction = async (
            request: Partial<SVMPredictRequest>,
        ): Promise<SVMPredictResponse | undefined> => {
            try {
                const result = await getSVMPrediction(request);
                set({ predictionData: result });
                return result;
            } catch (error) {
                console.error("Error connecting to SVM prediction api:", error);
            }
        };

        const resetModelData = () => {
            baseResetModelData();
            set({
                currentW1: 0,
                currentW2: 1,
                currentBias: 0,
                predictionData: null,
                predictionError: null,
                stepData: null,
                iterations: [],
            });
        };

        const getFeatureNames = (): string[] | null => {
            const { currentModelData } = get();
            if (!currentModelData?.metadata) return null;
            const meta = currentModelData.metadata as any;
            return [meta.feature_x_name, meta.feature_y_name];
        };

        const getClassNames = (): string[] | null => {
            const { currentModelData } = get();
            return currentModelData?.metadata?.class_names ?? null;
        };

        const predict = async (points: Record<string, number>) => {
            const { currentModelData, lastParams, currentW1, currentW2, currentBias } = get();
            set({ isPredicting: true, predictionError: null });
            try {
                // Perform frontend-only prediction for immediate feedback on the Predict page
                const meta = currentModelData?.metadata as any;
                if (meta) {
                    const xVal = points[meta.feature_x_name] ?? 0;
                    const yVal = points[meta.feature_y_name] ?? 0;
                    // SVM decision function: f(x) = w1*x + w2*y + b
                    const score = currentW1 * xVal + currentW2 * yVal + currentBias;
                    const classIndex = score > 0 ? 1 : 0;
                    const classNames = meta.class_names ?? ["Class 0", "Class 1"];
                    const predictedClass = classNames[classIndex] ?? `Class ${classIndex}`;
                    set({
                        singlePointPrediction: {
                            predictedClass,
                            predictedClassIndex: classIndex,
                        },
                    });
                }
                // Predict needs the full params from last visualizations
                const result = await makePrediction({
                    ...lastParams,
                    w1: currentW1,
                    w2: currentW2,
                    b: currentBias,
                    // The points are passed as a record, but the API expects a specific format if needed
                    // Currently makePrediction handles its own mapping if we pass w/b
                });
                if (!result) set({ predictionError: "Failed to get prediction" });
            } catch (err) {
                set({ predictionError: err instanceof Error ? err.message : "Prediction error" });
            } finally {
                set({ isPredicting: false });
            }
        };

        const clearPrediction = () => {
            set({ predictionData: null, predictionError: null, singlePointPrediction: null });
        };
        const visualizationData = currentModelData ?? null;
        const predictionResult: PredictionResult<SVMPredictResponse> | null = predictionData
            ? {
                  predictedClass:
                      singlePointPrediction?.predictedClass ??
                      (predictionData.loss < 0.5 ? "Good split" : "Bad split"),
                  predictedClassIndex: singlePointPrediction?.predictedClassIndex ?? 0,
                  additionalData: predictionData,
              }
            : null;
        return {
            singlePointPrediction,
            ...baseState,
            isLoading,
            error,
            data: currentModelData,
            train,
            isVisualizing,
            visualizationError,
            visualizationData,
            loadVisualization,
            resetModelData,
            currentW1,
            currentW2,
            currentBias,
            predictionResult,
            predictionData,
            makePrediction,
            getFeatureNames,
            getClassNames,
            isPredicting,
            predictionError,
            predict,
            clearPrediction,
            setManualWeights,
            randomizeWeights,
            computeHingeLoss,
            getLastParams,
            getParameters,
            isVisualizationLoading: isLoading || isVisualizing,
            lastVisualizationParams: lastParams as any,
            isStepLoading,
            stepData,
            performStep,
            decisionBoundary: mapDecisionBoundary(
                predictionData?.decision_boundary || currentModelData?.decision_boundary,
            ),
            iterations,
        };
    },
    deriveSVMState,
);

function deriveSVMState(state: SVMStore): Partial<SVMStore> {
    const boundary =
        state.predictionData?.decision_boundary || state.currentModelData?.decision_boundary;
    return {
        data: state.currentModelData,
        visualizationData: state.currentModelData,
        isVisualizationLoading: state.isLoading || state.isVisualizing,
        lastVisualizationParams: state.lastParams,
        decisionBoundary: boundary
            ? {
                  type: "classification",
                  meshPoints: boundary.mesh_points,
                  predictions: boundary.predictions,
                  dimensions: boundary.dimensions,
              }
            : null,
        predictionResult: state.predictionData
            ? {
                  predictedClass:
                      state.singlePointPrediction?.predictedClass ??
                      (state.predictionData.loss < 0.5 ? "Good split" : "Bad split"),
                  predictedClassIndex: state.singlePointPrediction?.predictedClassIndex ?? 0,
                  additionalData: state.predictionData,
              }
            : null,
    };
}
