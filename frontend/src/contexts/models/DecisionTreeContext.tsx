/**
 * Decision Tree Model Context
 * Manages state and API interactions for Decision Tree visualizations
 */

import { loadDataset } from "@/api/dataset";
import {
    calculateFeatureStats,
    calculateNodeStats,
    evaluateManualTree as evaluateManualTreeAPI,
    getParameters as getParametersAPI,
    trainModel as initiateTrainModel,
    predictWithInstructions,
    type DecisionTreeResponse,
} from "@/api/dt";
import { useDataset } from "@/store/useAppStore";
import type { components } from "@/types/api";
import type { ClassificationMetrics, TreeNode } from "@/types/model";
import type { Parameters } from "@/types/story";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode
} from "react";
import { createBaseModelContext, type BaseModelData, type PredictableModelContext, type PredictionResult, type TrainableModelContext } from "./BaseModelContext";

/**
 * DT-specific prediction additional data
 * Contains traversal instructions for visualization
 */
export interface DTPredictionAdditionalData {
    /**
     * List of traversal instructions from root to leaf
     * Each instruction indicates which direction to go at each split node
     * - "left": go to left child (feature value <= threshold)
     * - "right": go to right child (feature value > threshold)
     * - "stop": reached a leaf node
     */
    instructions: Array<"left" | "right" | "stop">;
}

const LOCAL_STORAGE_MODE_KEY = "dt_tree_mode";

// Define comprehensive DecisionTree model data type
interface DecisionTreeModelData extends BaseModelData {
    // Core tree data (from API response)
    success: boolean;
    model_key: string;
    cached: boolean;
    metadata: {
        [key: string]: unknown;
    };
    tree: TreeNode;
    metrics: ClassificationMetrics;
    
    // Tree mode tracking
    treeMode: 'trained' | 'manual';
    
    // Manual tree building state
    selectedNodePath: number[] | null;
    manualFeatureStats: components["schemas"]["ManualFeatureStatsResponse"] | null;
    selectedFeature: string | null;
    selectedThreshold: number | null;
}

// Create base context instance for DecisionTree
const { Provider: BaseProvider, useBaseModel } = createBaseModelContext<DecisionTreeModelData>({
    localStorageKey: "dt_tree_data",
    paramsStorageKey: "dt_params",
    getParameters: getParametersAPI,
});

// Manual tree building interface
interface ManualTreeInterface {
    tree: TreeNode | null;
    selectedNodePath: number[] | null;
    featureStats: components["schemas"]["ManualFeatureStatsResponse"] | null;
    selectedFeature: string | null;
    selectedThreshold: number | null;
    initialize: () => void;
    selectNode: (path: number[] | null) => void;
    loadFeatureStats: (feature: string) => Promise<void>;
    updateThreshold: (threshold: number) => void;
    splitNode: () => Promise<void>;
    markAsLeaf: () => Promise<void>;
    canSplit: () => boolean;
    evaluate: () => Promise<void>;
}

interface DecisionTreeContextType extends
    TrainableModelContext<DecisionTreeModelData>,
    PredictableModelContext<DecisionTreeModelData, DTPredictionAdditionalData> {
    // DT-specific properties
    treeMode: 'trained' | 'manual' | null;
    manualTree: ManualTreeInterface;

    // Keep existing method names for backward compatibility
    isModelLoading: boolean;        // = isLoading
    modelError: string | null;      // = error
    trainNewModel: (params: Parameters) => Promise<DecisionTreeModelData | null>;  // = train
    lastTrainedParams: Parameters;  // = lastParams
    clearStoredModelParams: () => void;
}

const DecisionTreeContext = createContext<DecisionTreeContextType | undefined>(
    undefined
);

/**
 * Props for the DecisionTreeProvider component.
 */
interface DecisionTreeProviderProps {
    children: ReactNode;
}

/**
 * Provides the DecisionTreeContext to its children components.
 * It manages the state and interactions with the Decision Tree API.
 */
export const DecisionTreeProvider: React.FC<DecisionTreeProviderProps> = ({
    children,
}) => {
    return (
        <BaseProvider>
            <DecisionTreeProviderInner>
                {children}
            </DecisionTreeProviderInner>
        </BaseProvider>
    );
};

const DecisionTreeProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
    const baseContext = useBaseModel();
    const { currentModelData, lastParams, setCurrentModelData, setLastParams, resetModelData: baseResetModelData, getLastParams, getParameters } = baseContext;

    // Access the active dataset from DatasetContext
    const { activeDataset } = useDataset();

    const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
    const [modelError, setModelError] = useState<string | null>(null);

    // Prediction state (for PredictableModelContext)
    const [isPredicting, setIsPredicting] = useState<boolean>(false);
    const [predictionError, setPredictionError] = useState<string | null>(null);
    const [predictionResult, setPredictionResult] = useState<PredictionResult<DTPredictionAdditionalData> | null>(null);

    // Extract commonly used values from currentModelData
    const treeMode = currentModelData?.treeMode || null;
    const manualTree = treeMode === 'manual' ? currentModelData?.tree : null;
    const selectedNodePath = currentModelData?.selectedNodePath || null;
    const manualFeatureStats = currentModelData?.manualFeatureStats || null;
    const selectedFeature = currentModelData?.selectedFeature || null;
    const selectedThreshold = currentModelData?.selectedThreshold || null;

    // Helper functions for manual tree manipulation
    const getNodeByPath = useCallback((tree: TreeNode | null, path: number[]): TreeNode | null => {
        if (!tree) return null;
        let current = tree;
        for (const index of path) {
            if (current.type !== 'split') return null;
            current = index === 0 ? current.left! : current.right!;
            if (!current) return null;
        }
        return current;
    }, []);

    const updateNodeAtPath = useCallback((tree: TreeNode, path: number[], updates: Partial<TreeNode>): TreeNode => {
        console.log('[updateNodeAtPath] Called with path:', path, 'updates:', updates);
        console.log('[updateNodeAtPath] Current tree:', tree);
        
        if (path.length === 0) {
            // Type-safe merge for root node update
            const result = { ...tree, ...updates } as TreeNode;
            console.log('[updateNodeAtPath] Updating root node, result:', result);
            return result;
        }
        
        const [index, ...restPath] = path;
        if (tree.type !== 'split') {
            console.log('[updateNodeAtPath] Tree is not split type, returning as-is');
            return tree;
        }
        
        if (index === 0) {
            const updatedLeft = tree.left ? updateNodeAtPath(tree.left, restPath, updates) : tree.left;
            const result = {
                ...tree,
                left: updatedLeft,
            };
            console.log('[updateNodeAtPath] Updated left child, result:', result);
            return result;
        } else {
            const updatedRight = tree.right ? updateNodeAtPath(tree.right, restPath, updates) : tree.right;
            const result = {
                ...tree,
                right: updatedRight,
            };
            console.log('[updateNodeAtPath] Updated right child, result:', result);
            return result;
        }
    }, []);

    const trainNewModel = useCallback(async (params: Parameters = {}): Promise<DecisionTreeModelData | null> => {
        setIsModelLoading(true);
        setModelError(null);
        try {
            // Include activeDataset if not already in params
            const requestParams = {
                ...params,
                dataset: params.dataset || activeDataset || undefined,
            };
            const data: DecisionTreeResponse = await initiateTrainModel(requestParams);
            
            console.log('[trainNewModel] API response:', data);

            if (data.success) {
                const modelData: DecisionTreeModelData = {
                    success: data.success,
                    model_key: data.model_key,
                    cached: data.cached,
                    metadata: data.metadata,
                    tree: data.tree,
                    metrics: data.metrics,
                    treeMode: 'trained',
                    selectedNodePath: null,
                    manualFeatureStats: null,
                    selectedFeature: null,
                    selectedThreshold: null,
                };
                console.log('[trainNewModel] Setting modelData:', modelData);
                setCurrentModelData(modelData);
                setLastParams(params);
                return modelData;
            } else {
                throw new Error(
                    "Training failed - API returned success: false"
                );
            }
        } catch (error) {
            console.error("Failed to train model:", error);
            setModelError(
                error instanceof Error
                    ? error.message
                    : "Unknown error training model"
            );
            setCurrentModelData(null);
            return null;
        } finally {
            setIsModelLoading(false);
        }
    }, [setCurrentModelData, setLastParams, activeDataset]);

    const clearStoredModelParams = useCallback(() => {
        baseResetModelData();
        setModelError(null);
        setIsModelLoading(false);
    }, [baseResetModelData]);

    // Track if we've attempted auto-load to prevent infinite loops
    const autoLoadAttempted = useRef(false);

    useEffect(() => {
        // Only auto-load trained model if:
        // 1. Haven't already attempted auto-load
        // 2. No tree data exists
        // 3. Not currently loading
        // 4. Has stored training parameters  
        // 5. Not in manual mode (manual tree takes precedence)
        if (
            !autoLoadAttempted.current &&
            !currentModelData &&
            !isModelLoading &&
            treeMode !== 'manual' &&
            lastParams
        ) {
            console.log('[AutoLoad] Attempting to load stored model with params:', lastParams);
            autoLoadAttempted.current = true;
            trainNewModel(lastParams);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty array = run only once on mount

    // Helper functions for prediction components
    const getFeatureNames = useCallback((): string[] | null => {
        if (!currentModelData?.metadata?.feature_names) {
            return null;
        }
        return currentModelData.metadata.feature_names as string[];
    }, [currentModelData]);

    const getClassNames = useCallback((): string[] | null => {
        if (!currentModelData?.metadata?.class_names) {
            return null;
        }
        console.log('[getClassNames] currentModelData:', currentModelData);
        return currentModelData.metadata.class_names as string[];
    }, [currentModelData]);

    // Prediction method (PredictableModelContext) - calls backend API
    const predict = useCallback(async (points: Record<string, number>) => {
        if (!currentModelData?.tree) {
            setPredictionError("No tree available for prediction");
            return;
        }

        setIsPredicting(true);
        setPredictionError(null);

        try {
            const classNames = getClassNames() || undefined;

            // Call backend API for prediction with traversal instructions
            const result = await predictWithInstructions({
                tree: currentModelData.tree,
                points,
                class_names: classNames,
            });

            setPredictionResult({
                predictedClass: result.predicted_class,
                predictedClassIndex: result.predicted_class_index,
                confidence: result.confidence,
                additionalData: {
                    instructions: result.instructions,
                }
            });
        } catch (error) {
            setPredictionError(error instanceof Error ? error.message : "Prediction failed");
        } finally {
            setIsPredicting(false);
        }
    }, [currentModelData, getClassNames]);

    // Clear prediction (PredictableModelContext)
    const clearPrediction = useCallback(() => {
        setPredictionResult(null);
        setPredictionError(null);
    }, []);

    // Manual tree building functions
    const initializeManualTree = useCallback(async () => {
        console.log('[ManualTree] initializeManualTree called');
        console.log('[ManualTree] currentModelData:', currentModelData);
        console.log('[ManualTree] treeMode:', treeMode);
        
        // If no tree data exists or not in manual mode, load dataset
        if (!currentModelData || treeMode !== 'manual') {
            console.log('[ManualTree] Loading dataset for manual tree...');
            try {
                let datasetResponse;
                if (activeDataset && 'type' in activeDataset && activeDataset.type === 'custom') {
                    // Custom dataset already has the data inline
                    datasetResponse = activeDataset as { X: number[][]; y: number[]; feature_names: string[]; target_names: string[] };
                } else {
                    // Predefined dataset — load from backend
                    const datasetName = (activeDataset && typeof activeDataset === 'object' && 'name' in activeDataset)
                        ? (activeDataset as any).name
                        : 'iris';
                    datasetResponse = await loadDataset(datasetName);
                }
                console.log('[ManualTree] Dataset loaded:', datasetResponse);
                
                // Calculate class distribution from dataset
                const classes = datasetResponse.target_names;
                const numClasses = classes.length;
                
                // Count samples per class from the target array
                const classCounts = new Array(numClasses).fill(0);
                datasetResponse.y.forEach((targetValue: number) => {
                    if (targetValue >= 0 && targetValue < numClasses) {
                        classCounts[targetValue]++;
                    }
                });
                
                // Convert counts to proportions for the value array
                const totalSamples = datasetResponse.y.length;
                const classProportions = classCounts.map(count => count / totalSamples);
                
                const rootNode: TreeNode = {
                    type: 'leaf',
                    samples: totalSamples,
                    impurity: 0, // Will be calculated by backend if needed
                    value: [classProportions], // Array of proportions for each class
                    samples_mask: Array.from({ length: totalSamples }, (_, i) => i), // [0, 1, 2, ..., n-1]
                };
                
                // For a single leaf node, create initial confusion matrix
                // This represents what happens when we predict the majority class for all samples
                const majorityClassIndex = classCounts.indexOf(Math.max(...classCounts));
                
                // Initialize confusion matrix with zeros
                const initialMatrix = Array(numClasses).fill(0).map(() => Array(numClasses).fill(0));
                
                // Fill the confusion matrix: all predictions go to majority class
                // Row = actual class, Column = predicted class
                classCounts.forEach((count, actualClassIndex) => {
                    initialMatrix[actualClassIndex][majorityClassIndex] = count;
                });
                
                // Calculate initial scores based on majority class prediction
                const correctPredictions = classCounts[majorityClassIndex];
                const initialAccuracy = correctPredictions / totalSamples;
                
                // Create tree data in manual mode
                const manualTreeData: DecisionTreeModelData = {
                    success: true,
                    model_key: 'manual_tree',
                    cached: false,
                    metadata: {
                        feature_names: datasetResponse.feature_names,
                        class_names: datasetResponse.target_names,
                    },
                    tree: rootNode,
                    // Initial metrics represent single leaf predicting majority class
                    metrics: {
                        train: {
                            confusion_matrix: initialMatrix,
                            accuracy: initialAccuracy,
                            precision: initialAccuracy, // Simplified for single-class prediction
                            recall: initialAccuracy,
                            f1: initialAccuracy,
                        },
                        test: {
                            confusion_matrix: initialMatrix,
                            accuracy: initialAccuracy,
                            precision: initialAccuracy, // Simplified for single-class prediction
                            recall: initialAccuracy,
                            f1: initialAccuracy,
                        }
                    },
                    treeMode: 'manual',
                    selectedNodePath: null,
                    manualFeatureStats: null,
                    selectedFeature: null,
                    selectedThreshold: null,
                };
                
                console.log('[ManualTree] Created manual tree data:', manualTreeData);
                
                setCurrentModelData(manualTreeData);
                setLastParams({});
            } catch (error) {
                console.error('[ManualTree] Failed to load dataset:', error);
            }
        }
    }, [currentModelData, treeMode, setCurrentModelData, setLastParams, activeDataset]);

    const selectManualNode = useCallback((path: number[] | null) => {
        if (!currentModelData) return;
        
        setCurrentModelData({
            ...currentModelData,
            selectedNodePath: path,
            selectedFeature: null,
            manualFeatureStats: null,
            selectedThreshold: null,
        });
    }, [currentModelData, setCurrentModelData]);

    const loadManualFeatureStats = useCallback(async (feature: string) => {
        if (!currentModelData || !selectedNodePath) return;
        
        const node = getNodeByPath(manualTree || null, selectedNodePath);
        if (!node) return;
        
        try {
            const stats = await calculateFeatureStats({
                feature,
                parent_samples_mask: node.samples_mask || null, // Use node's sample indices
                criterion: 'gini',
                max_thresholds: 100,
                dataset: activeDataset || undefined,
            });
            
            setCurrentModelData({
                ...currentModelData,
                selectedFeature: feature,
                manualFeatureStats: stats,
                selectedThreshold: null, // Let renderer default to minimum threshold
            });
        } catch (error) {
            console.error('Failed to load feature stats:', error);
        }
    }, [currentModelData, manualTree, selectedNodePath, getNodeByPath, setCurrentModelData, activeDataset]);

    const updateManualThreshold = useCallback((threshold: number) => {
        if (!currentModelData) return;
        
        setCurrentModelData({
            ...currentModelData,
            selectedThreshold: threshold,
        });
    }, [currentModelData, setCurrentModelData]);

    const splitManualNode = useCallback(async () => {
        if (!currentModelData || !manualTree || !selectedFeature || selectedThreshold === null || !selectedNodePath) return;
        
        const node = getNodeByPath(manualTree, selectedNodePath);
        if (!node) return;
        
        // Allow splitting both leaf and split nodes
        // If it's already a split node, we'll replace its children with new ones
        console.log('[ManualTree] Splitting node of type:', node.type);
        
        try {
            const nodeStats = await calculateNodeStats({
                feature: selectedFeature,
                threshold: selectedThreshold,
                parent_samples_mask: node.samples_mask || null, // Use node's sample indices
                criterion: 'gini',
                dataset: activeDataset || undefined,
            });
            
            console.log('[ManualTree] Node stats received:', nodeStats);
            console.log('[ManualTree] Left stats:', nodeStats.split_stats.left_stats);
            console.log('[ManualTree] Right stats:', nodeStats.split_stats.right_stats);
            
            // Convert class_probabilities dictionary to value array
            // The value array should be [[prob_class_0, prob_class_1, ...]]
            const classNames = nodeStats.class_names;
            const leftProbs = classNames.map(className => 
                nodeStats.split_stats.left_stats.class_probabilities[className] || 0
            );
            const rightProbs = classNames.map(className => 
                nodeStats.split_stats.right_stats.class_probabilities[className] || 0
            );
            
            console.log('[ManualTree] Left probabilities:', leftProbs);
            console.log('[ManualTree] Right probabilities:', rightProbs);
            
            // Create split node with left and right children
            const splitNode: TreeNode = {
                type: 'split',
                feature: selectedFeature,
                threshold: selectedThreshold,
                samples: node.samples,
                impurity: nodeStats.split_stats.parent_stats.impurity,
                value: node.value,
                samples_mask: node.samples_mask, // Preserve parent's sample mask
                histogram_data: nodeStats.histogram_data,
                left: {
                    type: 'leaf',
                    samples: nodeStats.split_stats.left_stats.samples,
                    impurity: nodeStats.split_stats.left_stats.impurity,
                    value: [leftProbs],
                    samples_mask: nodeStats.left_samples_mask, // From API response
                },
                right: {
                    type: 'leaf',
                    samples: nodeStats.split_stats.right_stats.samples,
                    impurity: nodeStats.split_stats.right_stats.impurity,
                    value: [rightProbs],
                    samples_mask: nodeStats.right_samples_mask, // From API response
                },
            };
            
            console.log('[ManualTree] Created split node:', splitNode);
            
            const newTree = updateNodeAtPath(manualTree, selectedNodePath, splitNode);
            
            // Update with the new tree
            const updatedModelData = {
                ...currentModelData,
                tree: newTree,
                selectedNodePath: null,
                selectedFeature: null,
                manualFeatureStats: null,
                selectedThreshold: null,
            };
            
            // Automatically evaluate the tree to get updated metrics
            try {
                const result = await evaluateManualTreeAPI({
                    tree: newTree,
                    dataset: activeDataset || undefined,
                });
                
                // Update with metrics
                setCurrentModelData({
                    ...updatedModelData,
                    metrics: result.metrics,
                });
            } catch (error) {
                console.error('[ManualTree] Failed to evaluate tree after split:', error);
                setCurrentModelData(updatedModelData);
            }
        } catch (error) {
            console.error('Failed to split node:', error);
        }
    }, [currentModelData, manualTree, selectedNodePath, selectedFeature, selectedThreshold, getNodeByPath, updateNodeAtPath, setCurrentModelData, activeDataset]);

    const markNodeAsLeaf = useCallback(async () => {
        if (!currentModelData || !manualTree || !selectedNodePath) return;
        
        const node = getNodeByPath(manualTree, selectedNodePath);
        if (!node) return;
        
        console.log('[ManualTree] Marking node as terminal leaf at path:', selectedNodePath);
        console.log('[ManualTree] Node before:', node);
        
        // If it's a split node, convert it to a leaf node
        // If it's already a leaf, just mark it as terminal
        let updatedNode: TreeNode;
        
        if (node.type === 'split') {
            // Convert split node to terminal leaf node
            updatedNode = {
                type: 'leaf',
                samples: node.samples,
                impurity: node.impurity,
                value: node.value,
                terminal: true,
            };
            console.log('[ManualTree] Converting split node to terminal leaf');
        } else {
            // Just mark the leaf as terminal
            updatedNode = {
                ...node,
                terminal: true,
            };
            console.log('[ManualTree] Marking leaf as terminal');
        }
        
        console.log('[ManualTree] Node after:', updatedNode);
        
        const updatedTree = updateNodeAtPath(manualTree, selectedNodePath, updatedNode);
        console.log('[ManualTree] Updated tree:', updatedTree);
        
        // Update with the new tree
        const updatedModelData = {
            ...currentModelData,
            tree: updatedTree,
            selectedNodePath: null,
            selectedFeature: null,
            manualFeatureStats: null,
            selectedThreshold: null,
        };

        // Automatically evaluate the tree to get updated metrics
        try {
            // Clean tree to remove frontend-only fields like 'terminal'
            const result = await evaluateManualTreeAPI({
                tree: updatedTree,
                dataset: activeDataset || undefined,
            });
            
            // Update with metrics
            setCurrentModelData({
                ...updatedModelData,
                metrics: result.metrics,
            });
        } catch (error) {
            console.error('[ManualTree] Failed to evaluate tree after marking as leaf:', error);
            setCurrentModelData(updatedModelData);
        }
    }, [currentModelData, manualTree, selectedNodePath, getNodeByPath, updateNodeAtPath, setCurrentModelData, activeDataset]);

    const canSplitManualNode = useCallback(() => {
        if (!selectedNodePath) return false;
        const node = getNodeByPath(manualTree || null, selectedNodePath);
        return node?.type === 'leaf' && selectedFeature !== null && selectedThreshold !== null;
    }, [manualTree, selectedNodePath, selectedFeature, selectedThreshold, getNodeByPath]);

    const evaluateManualTree = useCallback(async () => {
        if (!currentModelData || treeMode !== 'manual') {
            console.error('[ManualTree] Cannot evaluate: no manual tree data');
            return;
        }
        
        try {
            console.log('[ManualTree] Evaluating tree...');
            const result = await evaluateManualTreeAPI({
                tree: currentModelData.tree,
                dataset: activeDataset || undefined,
            });
            
            console.log('[ManualTree] Evaluation result:', result);
            
            // Update currentModelData with new metrics and preserve metadata
            setCurrentModelData({
                ...currentModelData,
                metrics: result.metrics,
                metadata: {
                    ...currentModelData.metadata,
                    ...result.metadata,
                },
            });
        } catch (error) {
            console.error('[ManualTree] Failed to evaluate tree:', error);
        }
    }, [currentModelData, treeMode, setCurrentModelData, activeDataset]);

    const resetModelData = useCallback(() => {
        console.log('[Context] Resetting model data');
        
        // Call base reset to clear shared data
        baseResetModelData();
        
        // Clear DT-specific localStorage
        localStorage.removeItem(LOCAL_STORAGE_MODE_KEY);
        
        // Clear local state
        setModelError(null);
        setIsModelLoading(false);
    }, [baseResetModelData]);

    // Log the complete tree structure whenever it changes
    useEffect(() => {
        if (manualTree) {
            console.log('[ManualTree] Tree updated:', JSON.stringify(manualTree, null, 2));
            console.log('[ManualTree] Tree object:', manualTree);
        }
    }, [manualTree]);

    const contextValue: DecisionTreeContextType = React.useMemo(() => ({
        // BaseModelContext (inherited)
        currentModelData,
        lastParams,
        setCurrentModelData,
        setLastParams,
        resetModelData,
        getLastParams,
        getParameters,

        // TrainableModelContext (for TrainPage)
        isLoading: isModelLoading,
        error: modelError,
        data: currentModelData,
        train: trainNewModel,

        // PredictableModelContext (for PredictPage)
        isPredicting,
        predictionError,
        predictionResult,
        predict,
        clearPrediction,
        getFeatureNames,
        getClassNames,

        // DT-specific (backward compatibility)
        isModelLoading,
        modelError,
        treeMode,
        lastTrainedParams: lastParams,
        trainNewModel,
        clearStoredModelParams,

        // Manual tree building
        manualTree: {
            tree: manualTree || null,
            selectedNodePath,
            featureStats: manualFeatureStats,
            selectedFeature,
            selectedThreshold,
            initialize: initializeManualTree,
            selectNode: selectManualNode,
            loadFeatureStats: loadManualFeatureStats,
            updateThreshold: updateManualThreshold,
            splitNode: splitManualNode,
            markAsLeaf: markNodeAsLeaf,
            canSplit: canSplitManualNode,
            evaluate: evaluateManualTree,
        },
    }), [
        currentModelData, lastParams, setCurrentModelData, setLastParams, resetModelData, getLastParams, getParameters,
        isModelLoading, modelError, trainNewModel,
        isPredicting, predictionError, predictionResult, predict, clearPrediction,
        getFeatureNames, getClassNames, treeMode, clearStoredModelParams,
        manualTree, selectedNodePath, manualFeatureStats, selectedFeature, selectedThreshold,
        initializeManualTree, selectManualNode, loadManualFeatureStats, updateManualThreshold,
        splitManualNode, markNodeAsLeaf, canSplitManualNode, evaluateManualTree
    ]);

    return (
        <DecisionTreeContext.Provider value={contextValue}>
            {children}
        </DecisionTreeContext.Provider>
    );
};

export const useDecisionTree = () => {
    const context = useContext(DecisionTreeContext);
    if (context === undefined) {
        throw new Error(
            "useDecisionTree must be used within a DecisionTreeProvider"
        );
    }
    return context;
};
