/**
 * Base Model Context
 * Provides shared data storage, persistence, and reset functionality for all model contexts
 */

import type { ParameterInfo } from "@/api/types";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";

/**
 * Base interface that all model data types should extend
 */
export interface BaseModelData {
    // Marker interface - models can extend this with their specific data
}

/**
 * Configuration for the base model context
 */
interface BaseModelConfig {
    localStorageKey: string;
    paramsStorageKey: string;
    getParameters: () => Promise<ParameterInfo[]>;
}

/**
 * Base context type that all model contexts will use
 */
export interface BaseModelContextType<TModelData extends BaseModelData> {
    currentModelData: TModelData | null;
    lastParams: Record<string, any>;
    setCurrentModelData: (data: TModelData | null | ((prev: TModelData | null) => TModelData | null)) => void;
    setLastParams: (params: Record<string, any>) => void;
    resetModelData: () => void;
    getLastParams: () => Record<string, any>;
    getParameters: () => Promise<ParameterInfo[]>;
}

/**
 * TrainPage capability interface
 * Models that support training/visualization pages should extend this
 */
export interface TrainableModelContext<TModelData extends BaseModelData> 
    extends BaseModelContextType<TModelData> {
    isLoading: boolean;
    error: string | null;
    data: TModelData | null;        // Alias for currentModelData
    train: (params: Record<string, any>) => Promise<void>;
}

/**
 * Generic prediction result with model-specific data in additionalData
 * - Common fields: predictedClass, predictedClassIndex, confidence (optional)
 * - Model-specific data accessed via additionalData with type narrowing
 */
export interface PredictionResult<T = unknown> {
    predictedClass: string;
    predictedClassIndex: number;
    confidence?: number;
    additionalData: T;  // Model-specific data (type-safe via generics)
}

/**
 * PredictPage capability interface
 * Models that support prediction pages should extend this.
 * Abstracts the prediction mechanism (client-side vs server-side).
 */
export interface PredictableModelContext<TModelData extends BaseModelData, TResult = unknown>
    extends BaseModelContextType<TModelData> {
    // Required helpers
    getFeatureNames: () => string[] | null;
    getClassNames: () => string[] | null;
    getPredictiveFeatureNames?: () => string[] | null; // Optional: for models using feature subsets

    // Prediction state
    isPredicting: boolean;
    predictionError: string | null;
    predictionResult: PredictionResult<TResult> | null;

    // Unified predict method - takes feature values as input
    predict: (points: Record<string, number>) => Promise<void>;
    clearPrediction: () => void;
}

/**
 * VizOnlyPage capability interface
 * Models that support visualization-only pages should extend this
 */
export interface VisualizableModelContext<TModelData extends BaseModelData>
    extends BaseModelContextType<TModelData> {
    isVisualizing: boolean;
    visualizationError: string | null;
    visualizationData: any | null;
    loadVisualization: (params?: any) => Promise<void>;
}

/**
 * StepPage capability interface
 * Models that support step-by-step interactive training should extend this.
 * This allows specialized pages for iterative algorithms like KMeans.
 */
export interface StepableModelContext<TModelData extends BaseModelData, TStepResponse = any>
    extends BaseModelContextType<TModelData> {
    isStepLoading: boolean;
    stepError: string | null;
    stepData: TStepResponse | null;
    performStep: (params: Record<string, any>) => Promise<void>;
}

/**
 * Create a base model context with the specified configuration
 */
export function createBaseModelContext<TModelData extends BaseModelData>(
    config: BaseModelConfig
) {
    const Context = createContext<BaseModelContextType<TModelData> | undefined>(
        undefined
    );

    interface ProviderProps {
        children: ReactNode;
    }

    const Provider: React.FC<ProviderProps> = ({ children }) => {
        // State for model data with localStorage persistence
        const [currentModelData, setCurrentModelDataState] = useState<TModelData | null>(() => {
            const stored = localStorage.getItem(config.localStorageKey);
            if (stored) {
                try {
                    console.log(`[BaseModelContext] Loading data from localStorage: ${config.localStorageKey}`);
                    return JSON.parse(stored);
                } catch (e) {
                    console.error(`[BaseModelContext] Failed to parse stored data:`, e);
                    return null;
                }
            }
            return null;
        });

        // State for last parameters
        const [lastParams, setLastParamsState] = useState<Record<string, any>>(() => {
            const stored = localStorage.getItem(config.paramsStorageKey);
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    console.error(`[BaseModelContext] Failed to parse stored params:`, e);
                    return {};
                }
            }
            return {};
        });

        // Persist currentModelData to localStorage whenever it changes
        useEffect(() => {
            if (currentModelData) {
                localStorage.setItem(config.localStorageKey, JSON.stringify(currentModelData));
            } else {
                localStorage.removeItem(config.localStorageKey);
            }
        }, [currentModelData]);

        // Persist lastParams to localStorage whenever it changes
        useEffect(() => {
            if (Object.keys(lastParams).length > 0) {
                localStorage.setItem(config.paramsStorageKey, JSON.stringify(lastParams));
            } else {
                localStorage.removeItem(config.paramsStorageKey);
            }
        }, [lastParams]);

        const setCurrentModelData = useCallback((data: TModelData | null | ((prev: TModelData | null) => TModelData | null)) => {
            console.log(`[BaseModelContext] Setting model data:`, typeof data === 'function' ? '(functional update)' : data);
            setCurrentModelDataState(data);
        }, []);

        const setLastParams = useCallback((params: Record<string, any>) => {
            console.log(`[BaseModelContext] Setting last params:`, params);
            setLastParamsState(params);
        }, []);

        const resetModelData = useCallback(() => {
            console.log(`[BaseModelContext] Resetting model data`);
            setCurrentModelDataState(null);
            setLastParamsState({});
            localStorage.removeItem(config.localStorageKey);
            localStorage.removeItem(config.paramsStorageKey);
        }, []);

        const getLastParams = useCallback(() => {
            return lastParams;
        }, [lastParams]);

        const contextValue: BaseModelContextType<TModelData> = {
            currentModelData,
            lastParams,
            setCurrentModelData,
            setLastParams,
            resetModelData,
            getLastParams,
            getParameters: config.getParameters,
        };

        return (
            <Context.Provider value={contextValue}>
                {children}
            </Context.Provider>
        );
    };

    const useBaseModel = () => {
        const context = useContext(Context);
        if (context === undefined) {
            throw new Error(
                "useBaseModel must be used within the corresponding Provider"
            );
        }
        return context;
    };

    return { Provider, useBaseModel };
}
