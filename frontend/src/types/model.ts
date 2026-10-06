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
type ClassificationMetadata = components["schemas"]["ClassificationMetadata"];

type RegressionMetrics = components["schemas"]["RegressionMetrics"];
export type RegressionMetadata = components["schemas"]["RegressionMetadata"];

// Training response type (auto-synced with backend DecisionTreeTrainingResponse)
export interface ClassifierResultData {
    metrics: ClassificationMetrics;
    metadata: ClassificationMetadata;
}

export interface RegressionResultData {
    metrics: RegressionMetrics;
    metadata: RegressionMetadata;
}
