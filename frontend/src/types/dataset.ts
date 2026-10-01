import type { components } from "@/types/api";

export type PredefinedBpeDataset = components["schemas"]["PredefinedBpeDataset"];
export type PredefinedRegexDataset = components["schemas"]["PredefinedRegexDataset"];
export type PredefinedPorterDataset = components["schemas"]["PredefinedPorterDataset"];

// DATASET TYPES
type Dataset =
    | components["schemas"]["ClassificationDataset"]
    | components["schemas"]["RegressionDataset"];
type PredefinedDataset =
    | components["schemas"]["PredefinedClassificationDataset"]
    | components["schemas"]["PredefinedRegressionDataset"]
    | PredefinedBpeDataset
    | PredefinedRegexDataset
    | PredefinedPorterDataset;

export type ActiveDataset = PredefinedDataset | Dataset;

export type DatasetReference = { type: "reference"; name: string };
