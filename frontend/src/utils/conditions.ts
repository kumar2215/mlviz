import type { ModelOption } from "@/types/parameters";
import type { Condition, Parameters, StoryHistory } from "@/types/story";

function getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    if (obj[path] !== undefined) return obj[path]; // Fallback for flat structure
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj);
}

function parameterCheck(expected: any, actual: any, comparator: string) {
    switch (comparator) {
        case "=":
            return actual == expected;
        case ">":
            return actual > expected;
        case ">=":
            return actual >= expected;
        case "<":
            return actual <= expected;
        case "<=":
            return actual <= expected;
        default:
            return false;
    }
}

export function isConditionMet(
    condition: Condition,
    state: Record<string, Parameters>
): boolean {
    // History is passed via the special __history key (see NavigationButton / NavigationBar)
    const history = state["__history"] as StoryHistory | undefined;

    switch (condition.condition_type) {
        case "Bypass":
            return true;

        case "Slide":
            return true;

        case "Parameter": {
            const paramValue = state[condition.category]?.[condition.parameter];
            return (
                paramValue != null &&
                parameterCheck(
                    condition.value,
                    paramValue,
                    condition.comparator
                )
            );
        }

        case "Wait": {
            const history = state["__history"] as StoryHistory | undefined;
            const now = (state["__now"] as unknown as number | undefined) ?? Date.now();
            const entries = history?.entries || [];

            let lastVisitTime = 0;
            // Find the most recent page_visit where the timer started
            for (let i = entries.length - 1; i >= 0; i--) {
                if (entries[i].type === "page_visit") {
                    lastVisitTime = entries[i].timestamp;
                    break;
                }
            }
            
            if (lastVisitTime > 0) {
                return (now - lastVisitTime) / 1000 >= condition.wait;
            }
            return false;
        }

        case "Button": {
            const entries = history?.entries || [];
            return entries.some(
                (e) => e.type === "button_click" && e.button_id === condition.button_id
            );
        }

        case "Lambda":
            // TODO: implement
            return true;

        case "And":
            return condition.conditions.every((c) => isConditionMet(c, state));

        case "Or":
            return condition.conditions.some((c) => isConditionMet(c, state));

        case "ActionCount": {
            const entries = history?.entries || [];
            const count = entries.filter((e) => e.type === condition.action).length;
            return count >= condition.min;
        }

        case "PageVisited": {
            const pagesVisited = history?.pagesVisited || [];
            return pagesVisited.includes(condition.page_id);
        }

        case "Metric": {
            const entries = history?.entries || [];
            const mode = condition.evaluation_mode || "any";

            if (mode === "latest") {
                // Find the latest entry that has the target metric
                for (let i = entries.length - 1; i >= 0; i--) {
                    const e = entries[i];
                    const metricValue = getNestedValue(e.metrics, condition.metric);
                    if (metricValue != null) {
                        return parameterCheck(
                            condition.value,
                            metricValue,
                            condition.comparator
                        );
                    }
                }
                return false;
            }

            // "any" mode: look at all entries
            return entries.some((e) => {
                const metricValue = getNestedValue(e.metrics, condition.metric);
                return (
                    metricValue != null &&
                    parameterCheck(
                        condition.value,
                        metricValue,
                        condition.comparator
                    )
                );
            });
        }

        default: {
            const exhaustiveCheck: never = condition;
            throw new Error(`Unknown condition type: ${(exhaustiveCheck as any)?.condition_type}`);
        }
    }
}

export function displayCondition(condition: Condition): string {
    switch (condition.condition_type) {
        case "Bypass":
            return "Continue.";

        case "Slide":
            return `${
                condition.slide_description ? condition.slide_description : ""
            }`;

        case "Parameter":
            return `Set ${condition.parameter} ${condition.comparator} ${condition.value}`;

        case "Wait":
            return `Wait ${condition.wait}`;

        case "Button":
            return `Click on ${condition.button_id}`;

        case "Lambda":
            return `Satisfy ${condition.exec_str}`;

        case "And":
            return condition.conditions
                .map((c) => displayCondition(c))
                .join(" AND \n");

        case "Or":
            return condition.conditions
                .map((c) => displayCondition(c))
                .join(" OR \n");

        case "ActionCount":
            return `Perform "${condition.action}" at least ${condition.min} time${
                condition.min === 1 ? "" : "s"
            }`;

        case "PageVisited":
            return `Visit page ${condition.page_id}`;

        case "Metric":
            const modeText = condition.evaluation_mode === "latest" ? " (latest result)" : "";
            return `Achieve ${condition.metric} ${condition.comparator} ${condition.value}${modeText}`;

        default: {
            const exhaustiveCheck: never = condition;
            throw new Error(`Unknown condition type: ${(exhaustiveCheck as any)?.condition_type}`);
        }
    }
}

function retrieveWhitelistParameters(
    response: ModelOption[],
    whitelist?: string[]
) {
    if (!whitelist) return response;
    return response.filter((m) => whitelist.includes(m.name));
}

function retrieveBlacklistParameters(
    response: ModelOption[],
    blacklist?: string[]
) {
    if (!blacklist) return response;
    return response.filter((m) => !blacklist.includes(m.name));
}

export function filterParameters(
    response: ModelOption[],
    parameters?: Record<string, string[]>
) {
    if (!parameters) return response;
    return retrieveBlacklistParameters(
        retrieveWhitelistParameters(response, parameters.whitelist),
        parameters.blacklist
    );
}
