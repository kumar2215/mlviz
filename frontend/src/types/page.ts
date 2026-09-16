import type { ActiveDataset, DatasetReference } from "@/types/dataset";

export type Parameters = Record<string, any>;

interface BasePage {
    page_type: "static" | "dynamic";
    name?: string;
    parameters?: Parameters;
    dataset?: ActiveDataset | DatasetReference | null;
    note?: string;
}

export interface StaticPageParameters {
    text: string;
    path: string;
}

export interface StaticPage extends BasePage, StaticPageParameters {
    page_type: "static";
}

export interface DynamicPageParameters extends BasePage {
    page_type: "dynamic";
    dynamic_type: "model" | "none";
}

export interface DynamicPage extends DynamicPageParameters {
    dynamic_type: "none";
}

export interface ModelPage extends DynamicPageParameters {
    dynamic_type: "model";
    model_name: string;
    component_type: "train" | "predict" | "manual" | "viz_only" | "step";
    problem_type: "classifier" | "clustering" | "regression";
}

export type DynamicPageUnion = DynamicPage | ModelPage;

export type PageUnion = StaticPage | DynamicPageUnion;
