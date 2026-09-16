import type { components } from "@/types/api";

// DATASET TYPES
export type Dataset =
    | components["schemas"]["ClassificationDataset"]
    | components["schemas"]["RegressionDataset"];
export type PredefinedDataset =
    | components["schemas"]["PredefinedClassificationDataset"]
    | components["schemas"]["PredefinedRegressionDataset"];

export type ActiveDataset = PredefinedDataset | Dataset;

export type DatasetReference = { type: "reference"; name: string };
