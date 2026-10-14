import type { components } from "@/types/api";

export type PredefinedBpeDataset = components["schemas"]["PredefinedBpeDataset"];
export type PredefinedRegexDataset = components["schemas"]["PredefinedRegexDataset"];
export type PredefinedPorterDataset = components["schemas"]["PredefinedPorterDataset"];
export type CustomBpeDataset = components["schemas"]["CustomBpeDataset"];
export type CustomRegexDataset = components["schemas"]["CustomRegexDataset"];
export type CustomPorterDataset = components["schemas"]["CustomPorterDataset"];
export type BpeDataset = PredefinedBpeDataset | CustomBpeDataset;
export type RegexDataset = PredefinedRegexDataset | CustomRegexDataset;
export type PorterDataset = PredefinedPorterDataset | CustomPorterDataset;

// DATASET TYPES
type Dataset =
    | components["schemas"]["ClassificationDataset"]
    | components["schemas"]["RegressionDataset"]
    | CustomBpeDataset
    | CustomRegexDataset
    | CustomPorterDataset;
type PredefinedDataset =
    | components["schemas"]["PredefinedClassificationDataset"]
    | components["schemas"]["PredefinedRegressionDataset"]
    | PredefinedBpeDataset
    | PredefinedRegexDataset
    | PredefinedPorterDataset;

export type ActiveDataset = PredefinedDataset | Dataset;

export type DatasetReference = { type: "reference"; name: string };
