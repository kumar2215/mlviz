/**
 * Shared pages accept different model stores. Require a selector at this boundary
 * so their hooks cannot accidentally subscribe to an entire model again.
 */
export type ModelSelectorHook = <Selected>(selector: (state: any) => Selected) => Selected;
