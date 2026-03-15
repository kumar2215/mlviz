/**
 * Model types - now auto-generated from backend Pydantic models.
 * These types are automatically synced with the FastAPI OpenAPI spec.
 *
 * To regenerate: npm run generate:types
 */
import type { components } from "./api";

// Core tree structure types (auto-synced with backend)
// Note: TreeNode is a Union type in Python but OpenAPI exports the individual types
export type TreeNode = components["schemas"]["SplitNode-Output"] | components["schemas"]["LeafNode"];
export type HistogramData = components["schemas"]["HistogramData"];

// Metrics/scores types
export type ClassificationMetrics = components["schemas"]["ClassificationMetrics"];
export type ClassificationMetadata = components["schemas"]["ClassificationMetadata"];

export type RegressionMetrics = components["schemas"]["RegressionMetrics"];
export type RegressionMetadata = components["schemas"]["RegressionMetadata"];

export interface ModelMetadata {
    created_at: string;
    dataset_info: any;
    feature_names: string[];      // ✅ Critical for prediction!
    class_names: string[];       // ✅ Also needed for prediction
    // Sklearn parameters
    max_depth?: number;
    criterion?: string;
    min_samples_split?: number;
    min_samples_leaf?: number;
    random_state?: number;
    max_features?: string | number | null;
}

// Training response type (auto-synced with backend DecisionTreeTrainingResponse)
export type TrainModelResponse = components["schemas"]["DecisionTreeTrainingResponse"] | components["schemas"]["KNNTrainingResponse"];

export interface PredictionProps {
    data?: Record<string, any>;
    points?: Record<string, any>;
}

export interface ClassifierResultData {
    metrics: ClassificationMetrics;
    metadata: ClassificationMetadata;
}

export interface RegressionResultData {
    metrics: RegressionMetrics;
    metadata: RegressionMetadata;
}
