
type ActionType =
    | "train"
    | "predict"
    | "step"
    | "manual_evaluate"
    | "page_visit"
    | "button_click";

interface BaseCondition {
    condition_type: string;
    name?: string;
    description?: string;
}

interface ParameterCheck extends BaseCondition {
    condition_type: "Parameter";
    parameter: string;
    comparator: "<" | "<=" | ">=" | ">" | "=";
    value: any;
    category: string;
}

interface TimeCheck extends BaseCondition {
    condition_type: "Wait";
    wait: number;
}

interface ButtonPress extends BaseCondition {
    condition_type: "Button";
    button_id: string;
}

interface BypassCheck extends BaseCondition {
    condition_type: "Bypass";
}

interface SlideCheck extends BaseCondition {
    condition_type: "Slide";
    slide_name: string;
    slide_description?: string;
}

interface Lambda extends BaseCondition {
    condition_type: "Lambda";
    exec_str: string;
}

interface AndCheck extends BaseCondition {
    condition_type: "And";
    conditions: Condition[];
}

interface OrCheck extends BaseCondition {
    condition_type: "Or";
    conditions: Condition[];
}

interface ActionCountCheck extends BaseCondition {
    condition_type: "ActionCount";
    /** The action type to count (e.g. "train", "step", "predict"). */
    action: ActionType;
    /** Minimum number of times the action must have occurred. */
    min: number;
}

interface PageVisitedCheck extends BaseCondition {
    condition_type: "PageVisited";
    /** The local_index of the page that must have been visited. */
    page_id: number;
}

interface MetricCheck extends BaseCondition {
    condition_type: "Metric";
    /** The metric name to check (e.g. "accuracy", "error"). */
    metric: string;
    comparator: "<" | "<=" | ">=" | ">" | "=";
    value: number;
    evaluation_mode?: "any" | "latest";
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
    | PageVisitedCheck
    | MetricCheck;
