import {
    getParameters,
    getSVMPrediction,
    trainSVM,
    type SVMPredictRequest,
    type SVMPredictResponse,
    type SVMTrainRequest,
    type SVMTrainResponse,
} from "@/api/svm";
import type { DecisionBoundary } from "@/components/plots/types";

import {
    createBaseModelContext,
    type BaseModelData,
    type PredictableModelContext,
    type PredictionResult,
    type TrainableModelContext,
    type VisualizableModelContext,
} from "@/contexts/models/BaseModelContext";
import type { ReactNode } from "react";
import React, { createContext, useCallback, useContext } from "react";

/**
 * SVM Model Context
 * Manages state and API interactions for Support Vector Machine classification visualizations
 */

interface SVMModelData extends BaseModelData, SVMTrainResponse {
    // Basic shared structure
}

export interface SVMPredictAdditionalData {
    loss: number;
}

const {
    Provider: BaseModelProvider,
    useBaseModel: useBaseModelContext,
} = createBaseModelContext<SVMModelData>({
    localStorageKey: "svm_model_data",
    paramsStorageKey: "svm_params",
    getParameters,
});

interface SVMContextType
    extends
        TrainableModelContext<SVMModelData>,
        VisualizableModelContext<SVMModelData>,
        PredictableModelContext<SVMModelData, SVMPredictResponse> {

    // SVM-specific properties
    currentW1: number;
    currentW2: number;
    currentBias: number;
    predictionData: SVMPredictResponse | null;
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
    
    // Prediction extension (inherited from PredictableModelContext)
    isPredicting: boolean;
    predictionError: string | null;
    predictionResult: PredictionResult<SVMPredictResponse> | null;


    // Actions
    makePrediction: (request: Partial<SVMPredictRequest>) => Promise<SVMPredictResponse | undefined>;
    setManualWeights: (w1: number, w2: number, b: number) => void;
    randomizeWeights: () => void;
    computeHingeLoss: (w1: number, w2: number, b: number) => number;
}

const SVMContext = createContext<SVMContextType | undefined>(undefined);

export const SVMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <BaseModelProvider>
            <SVMProviderInner>{children}</SVMProviderInner>
        </BaseModelProvider>
    );
};

const SVMProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
    const baseContext = useBaseModelContext();
    const {
        currentModelData,
        lastParams,
        setCurrentModelData,
        setLastParams,
        resetModelData: baseResetModelData,
        getLastParams,
        getParameters,
    } = baseContext;

    // Loading & error states
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isVisualizing, setIsVisualizing] = React.useState(false);
    const [visualizationError, setVisualizationError] = React.useState<string | null>(null);
    const [isPredicting, setIsPredicting] = React.useState(false);
    const [predictionError, setPredictionError] = React.useState<string | null>(null);

    // SVM specific iterative state
    const [currentW1, setCurrentW1] = React.useState<number>(0);
    const [currentW2, setCurrentW2] = React.useState<number>(0);
    const [currentBias, setCurrentBias] = React.useState<number>(0);

    const [predictionData, setPredictionData] = React.useState<SVMPredictResponse | null>(null);
    const [singlePointPrediction, setSinglePointPrediction] = React.useState<{
        predictedClass: string;
        predictedClassIndex: number;
    } | null>(null);

    // Iterations are kept in memory only — never persisted to localStorage
    // because the mesh_predictions arrays are too large (~2500 strings × 10 iter).
    const [iterations, setIterations] = React.useState<Array<{
        iteration: number;
        w1: number;
        w2: number;
        b: number;
        loss: number;
        mesh_predictions?: string[];
        support_vector_indices?: number[];
        alphas?: number[];
        optimised_points?: number[];
    }>>([]);

    // Initialise randomized weights if empty/NaN 
    const randomizeWeights = useCallback(() => {
        setCurrentW1(Math.random() * 2 - 1);
        setCurrentW2(Math.random() * 2 - 1);
        setCurrentBias(Math.random() * 2 - 1);
        setPredictionData(null);
    }, []);

    const setManualWeights = useCallback((w1: number, w2: number, b: number) => {
        setCurrentW1(w1);
        setCurrentW2(w2);
        setCurrentBias(b);
    }, []);

    // Hinge loss computation for the LossMapHUD generic component
    const computeHingeLoss = useCallback((w1: number, w2: number, b: number) => {
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
    }, [currentModelData]);

    const train = useCallback(
        async (params: Partial<SVMTrainRequest>): Promise<SVMModelData | null> => {
            try {
                setIsLoading(true);
                setError(null);
                setLastParams(params);

                const {
                    dataset,
                    boundary_resolution,
                    parameters: existingParameters,
                    ...flatParams
                } = params as any;

                const request: Partial<SVMTrainRequest> = {
                    parameters: Object.keys(flatParams).length > 0
                        ? { ...existingParameters, ...flatParams }
                        : existingParameters,
                    dataset,
                    boundary_resolution,
                };

                const result = await trainSVM(request);

                // Extract iterations and strip them from the persisted model data
                // to avoid exceeding the localStorage quota.
                const { iterations: resultIterations, ...resultWithoutIterations } = result as any;
                setIterations(resultIterations ?? []);

                const modelData: SVMModelData = {
                    ...resultWithoutIterations,
                    metrics: result.metrics,
                    metadata: {
                        ...(result.metadata as any || {}),
                        model_name: "svm",
                        problem_type: "classification",
                        dataset_name: typeof params.dataset === "string" ? params.dataset : (params.dataset as any)?.info?.name || "Unknown"
                    } as any
                };
                
                setCurrentModelData(modelData);
                setIsLoading(false);
                return modelData;
            } catch (error) {
                console.error("Error training SVM:", error);
                setError(
                    error instanceof Error ? error.message : "Unknown error training SVM"
                );
                setIsLoading(false);
                return null;
            }
        },
        [setLastParams, setCurrentModelData]
    );

    const loadVisualization = useCallback(
        async (params?: Partial<SVMTrainRequest>): Promise<SVMModelData | null> => {
            setIsVisualizing(true);
            setVisualizationError(null);
            const res = await train(params || {});
            
            // Mirror training errors to visualization errors
            if (!res) setVisualizationError("Error visualising SVM");
            
            setIsVisualizing(false);
            return res;
        },
        [train]
    );

    const makePrediction = useCallback(
        async (request: Partial<SVMPredictRequest>): Promise<SVMPredictResponse | undefined> => {
            try {
                const result = await getSVMPrediction(request);
                setPredictionData(result);
                return result;
            } catch (error) {
                console.error("Error connecting to SVM prediction api:", error);
            }
        },
        []
    );

    const resetModelData = useCallback(() => {
        baseResetModelData();
        setCurrentW1(0);
        setCurrentW2(0);
        setCurrentBias(0);
        setPredictionData(null);
        setPredictionError(null);
        setIterations([]);
    }, [baseResetModelData]);

    const visualizationData = currentModelData ?? null;

    const mapDecisionBoundary = (boundary: any): DecisionBoundary | null => {
        if (!boundary) return null;
        return {
            type: "classification",
            meshPoints: boundary.mesh_points || boundary.meshPoints,
            predictions: boundary.predictions,
            dimensions: boundary.dimensions
        };
    };

    const predictionResult: PredictionResult<SVMPredictResponse> | null = 
        predictionData ? {
            predictedClass: singlePointPrediction?.predictedClass ?? (predictionData.loss < 0.5 ? "Good split" : "Bad split"), 
            predictedClassIndex: singlePointPrediction?.predictedClassIndex ?? 0,
            additionalData: predictionData
        } : null;

    const getFeatureNames = useCallback((): string[] | null => {
        if (!currentModelData?.metadata) return null;
        const meta = currentModelData.metadata as any;
        return [meta.feature_x_name, meta.feature_y_name];
    }, [currentModelData?.metadata]);

    const getClassNames = useCallback((): string[] | null => {
        return currentModelData?.metadata?.class_names ?? null;
    }, [currentModelData?.metadata?.class_names]);

    const predict = useCallback(async (points: Record<string, number>) => {
        setIsPredicting(true);
        setPredictionError(null);
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

                setSinglePointPrediction({
                    predictedClass,
                    predictedClassIndex: classIndex
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
            if (!result) setPredictionError("Failed to get prediction");
        } catch (err) {
            setPredictionError(err instanceof Error ? err.message : "Prediction error");
        } finally {
            setIsPredicting(false);
        }
    }, [makePrediction, lastParams, currentW1, currentW2, currentBias]);

    const clearPrediction = useCallback(() => {
        setPredictionData(null);
        setPredictionError(null);
        setSinglePointPrediction(null);
    }, []);



    const contextValue: SVMContextType = {
        ...baseContext,
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
        decisionBoundary: mapDecisionBoundary(predictionData?.decision_boundary || currentModelData?.decision_boundary),
        iterations,
    };

    return <SVMContext.Provider value={contextValue}>{children}</SVMContext.Provider>;
};

export const useSVMContext = () => {
    const context = useContext(SVMContext);
    if (context === undefined) {
        throw new Error("useSVMContext must be used within an SVMProvider");
    }
    return context;
};
