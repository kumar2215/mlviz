/**
 * Base Model Store
 * Provides shared data storage, persistence, and reset functionality for all model stores
 */
import type { ParameterInfo } from "@/api/types";
import { create, type StoreApi } from "zustand";

/**
 * Base interface that all model data types should extend
 */
export interface BaseModelData {}

/**
 * Configuration for the base model store
 */
interface BaseModelConfig {
    localStorageKey: string;
    paramsStorageKey: string;
    getParameters: () => Promise<ParameterInfo[]>;
}

/**
 * Base store type that all model stores will use
 */
export interface BaseModelState<TModelData extends BaseModelData> {
    currentModelData: TModelData | null;
    lastParams: Record<string, any>;
    setCurrentModelData: (
        data: TModelData | null | ((prev: TModelData | null) => TModelData | null),
    ) => void;
    setLastParams: (params: Record<string, any>) => void;
    resetModelData: () => void;
    getLastParams: () => Record<string, any>;
    getParameters: () => Promise<ParameterInfo[]>;
}

/**
 * TrainPage capability interface
 * Models that support training/visualization pages should extend this
 */
export interface TrainableModelState<TModelData extends BaseModelData>
    extends BaseModelState<TModelData> {
    isLoading: boolean;
    error: string | null;
    data: TModelData | null; // Alias for currentModelData
    train: (params: Record<string, any>) => Promise<TModelData | null>;
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
    additionalData: T; // Model-specific data (type-safe via generics)
}

/**
 * PredictPage capability interface
 * Models that support prediction pages should extend this.
 * Abstracts the prediction mechanism (client-side vs server-side).
 */
export interface PredictableModelState<TModelData extends BaseModelData, TResult = unknown>
    extends BaseModelState<TModelData> {
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
export interface VisualizableModelState<TModelData extends BaseModelData>
    extends BaseModelState<TModelData> {
    isVisualizing: boolean;
    visualizationError: string | null;
    visualizationData: any | null;
    loadVisualization: (params?: any) => Promise<TModelData | null>;
}

/**
 * StepPage capability interface
 * Models that support step-by-step interactive training should extend this.
 * This allows specialized pages for iterative algorithms like KMeans.
 */
export interface StepableModelState<
    TModelData extends BaseModelData,
    TStepResponse = TModelData,
    TStepRequest = Record<string, any>,
> extends BaseModelState<TModelData> {
    isStepLoading: boolean;
    stepError: string | null;
    stepData: TStepResponse | null;
    // Return type is TStepResponse|null; models re-declare performStep with their specific types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    performStep: (params: TStepRequest) => Promise<any>;
}

/** Read the existing plain JSON format so saved models survive the migration. */
function readStored<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? (JSON.parse(stored) as T) : fallback;
    } catch (error) {
        console.error(`[ModelStore] Failed to load ${key}`, error);
        return fallback;
    }
}

function persistValue(key: string, value: unknown, empty: boolean) {
    try {
        if (empty) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Storage limits must not turn a successful API request into a failure.
        console.error(`[ModelStore] Failed to persist ${key}`, error);
    }
}

type ModelSetter<T> = (update: Partial<T> | ((state: T) => Partial<T>)) => void;

/**
 * Build a provider-free model store with the legacy storage format.
 * Derived fields are updated in the same transaction as their source fields,
 * keeping aliases and model-specific views consistent for every subscriber.
 */
export function createBaseModelStore<
    TData extends BaseModelData,
    TStore extends BaseModelState<TData>,
>(
    config: BaseModelConfig,
    initialize: (
        set: ModelSetter<TStore>,
        get: () => TStore,
        base: BaseModelState<TData>,
    ) => TStore,
    derive: (state: TStore, previous?: TStore) => Partial<TStore>,
) {
    const store = create<TStore>()((rawSet, get, api) => {
        const set: StoreApi<TStore>["setState"] = (update, replace?) => {
            const previous = get();
            const patch = typeof update === "function" ? update(previous) : update;
            const next = (replace ? patch : { ...previous, ...patch }) as TStore;
            rawSet({ ...next, ...derive(next, previous) }, true);
        };
        api.setState = set;
        const base: BaseModelState<TData> = {
            currentModelData: readStored<TData | null>(config.localStorageKey, null),
            lastParams: readStored(config.paramsStorageKey, {}),
            setCurrentModelData: (data) =>
                set(
                    (state) =>
                        ({
                            currentModelData:
                                typeof data === "function" ? data(state.currentModelData) : data,
                        }) as Partial<TStore>,
                ),
            setLastParams: (lastParams) => set({ lastParams } as Partial<TStore>),
            resetModelData: () =>
                set({ currentModelData: null, lastParams: {} } as Partial<TStore>),
            getLastParams: () => get().lastParams,
            getParameters: config.getParameters,
        };
        const initial = initialize(set, get, base);
        return { ...initial, ...derive(initial) };
    });
    store.subscribe((state, previous) => {
        if (state.currentModelData !== previous.currentModelData) {
            persistValue(
                config.localStorageKey,
                state.currentModelData,
                state.currentModelData === null,
            );
        }
        if (state.lastParams !== previous.lastParams) {
            persistValue(
                config.paramsStorageKey,
                state.lastParams,
                Object.keys(state.lastParams).length === 0,
            );
        }
    });
    return store;
}
