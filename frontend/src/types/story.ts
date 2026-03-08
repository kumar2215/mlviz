import { type components } from "./api";

export type Index = number;

// ============================================================================
// History Tracking
// ============================================================================

export type ActionType =
    | "train"
    | "predict"
    | "step"
    | "manual_evaluate"
    | "page_visit"
    | "button_click";

export interface HistoryEntry {
    type: ActionType;
    timestamp: number;
    page_id?: number;    // for page_visit
    button_id?: string;  // for button_click
    params?: Parameters; // for train / step / predict
}

export interface StoryHistory {
    entries: HistoryEntry[];
    pagesVisited: number[]; // ordered list of visited page indices
}

interface BaseCondition {
    condition_type: string;
    name?: string;
    description?: string;
}

export interface ParameterCheck extends BaseCondition {
    condition_type: "Parameter";
    parameter: string;
    comparator: "<" | "<=" | ">=" | ">" | "=";
    value: any;
    category: string;
}

export interface TimeCheck extends BaseCondition {
    condition_type: "Wait";
    wait: number;
}

export interface ButtonPress extends BaseCondition {
    condition_type: "Button";
    button_id: string;
}

export interface BypassCheck extends BaseCondition {
    condition_type: "Bypass";
}

export interface SlideCheck extends BaseCondition {
    condition_type: "Slide";
    slide_name: string;
    slide_description?: string;
}

export interface Lambda extends BaseCondition {
    condition_type: "Lambda";
    exec_str: string;
}

export interface AndCheck extends BaseCondition {
    condition_type: "And";
    conditions: Condition[];
}

export interface OrCheck extends BaseCondition {
    condition_type: "Or";
    conditions: Condition[];
}

export interface ActionCountCheck extends BaseCondition {
    condition_type: "ActionCount";
    /** The action type to count (e.g. "train", "step", "predict"). */
    action: ActionType;
    /** Minimum number of times the action must have occurred. */
    min: number;
}

export interface PageVisitedCheck extends BaseCondition {
    condition_type: "PageVisited";
    /** The local_index of the page that must have been visited. */
    page_id: number;
}

export type Condition =
    | ParameterCheck
    | TimeCheck
    | ButtonPress
    | BypassCheck
    | SlideCheck
    | Lambda
    | AndCheck
    | OrCheck
    | ActionCountCheck
    | PageVisitedCheck;

export interface EdgeNode {
    local_index: number;
    story_name: undefined | null | string;
}

export interface Edge {
    start: EdgeNode;
    end: EdgeNode;
    condition: Condition;
}

export type Parameters = Record<string, any>;

export type DatasetReference = { type: "reference"; name: string };

interface BasePage {
    page_type: "static" | "dynamic";
    name?: string;
    parameters?: Parameters;
    dataset?: 
        | components["schemas"]["PredefinedDataset"] 
        | components["schemas"]["Dataset"]
        | DatasetReference;
    note?: string;
}

export interface StaticPageParameters {
    text?: string;
    link?: string;
}

export interface StaticPage extends BasePage {
    page_type: "static";
    parameters: StaticPageParameters;
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
    problem_type: "classifier" | "clustering" | "prediction";
}

export type DynamicPageUnion = DynamicPage | ModelPage;

export type PageUnion = StaticPage | DynamicPageUnion;

export interface StoryNode {
    index: Index;
}

export interface Story {
    name: string;
    description: string;
    start_page: number;
    nodes: StoryNode[];
    edges: Edge[];
}

export interface Config {
    stories: Record<string, Story>;
    pages: Record<Index, PageUnion>;
    datasets?: Record<string, components["schemas"]["PredefinedDataset"] | components["schemas"]["Dataset"]>;
}

export type TrainingParameters = Record<string, any>;
