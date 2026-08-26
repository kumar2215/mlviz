import { useConfig, useDataset } from "@/store/useAppStore";
import { ModelNameProvider, ModelProvider } from "@/contexts/ModelContext";
import ModelPage from "@/pages/model/ModelPage";
import type { DynamicPageUnion } from "@/types/story";
import React, { useEffect } from "react";

interface DynamicPageProps {
    page: DynamicPageUnion;
}

const REGRESSION_DATASET_TYPES = new Set([
    "predefined_regression",
    "custom_regression",
]);
const CLASSIFICATION_DATASET_TYPES = new Set(["predefined", "custom"]);

function isDatasetCompatible(
    datasetType: string,
    problemType: string,
): boolean {
    if (problemType === "regression") {
        return REGRESSION_DATASET_TYPES.has(datasetType);
    }
    if (problemType === "classifier" || problemType === "clustering") {
        return CLASSIFICATION_DATASET_TYPES.has(datasetType);
    }
    return true;
}

const DynamicPage: React.FC<DynamicPageProps> = ({ page }) => {
    const { activeDataset, setDataset, clearDataset } = useDataset();
    const { config } = useConfig();

    // Resolve dataset if it's a reference
    const resolvedDataset =
        page.dataset?.type === "reference"
            ? config?.datasets?.[page.dataset.name]
            : page.dataset;

    const problemType =
        page.dynamic_type === "model" ? page.problem_type : undefined;

    useEffect(() => {
        if (resolvedDataset) {
            console.log("[DynamicPage] Setting dataset:", resolvedDataset);
            setDataset(resolvedDataset);
        } else if (problemType && activeDataset) {
            if (!isDatasetCompatible(activeDataset.type, problemType)) {
                console.log(
                    `[DynamicPage] Clearing incompatible dataset (type="${activeDataset.type}") for problem_type="${problemType}"`,
                );
                clearDataset();
            }
        }
    }, [resolvedDataset, problemType, activeDataset, setDataset, clearDataset]);

    if (resolvedDataset && activeDataset !== resolvedDataset) {
        return null;
    }

    if (page.dynamic_type == "none") {
        return <></>;
    } else if (page.dynamic_type == "model") {
        return (
            <ModelProvider model_name={page.model_name}>
                <ModelNameProvider value={page.model_name}>
                    <ModelPage
                        model_name={page.model_name}
                        component_type={page.component_type}
                        parameters={page.parameters}
                        problem_type={page.problem_type}
                        dataset={resolvedDataset}
                    />
                </ModelNameProvider>
            </ModelProvider>
        );
    }
};

export default DynamicPage;
