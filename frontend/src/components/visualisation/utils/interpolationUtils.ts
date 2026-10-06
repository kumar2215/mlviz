import type { VisualisationRenderContext } from "../types";

/**
 * Calculate interpolation factor for a given depth/step
 * Returns 0-1 value representing how much of the element should be revealed
 */
export const calculateInterpolationFactor = (
    elementDepth: number,
    context: VisualisationRenderContext
): number => {
    const { interpolation, currentStep = 0 } = context.state;

    if (!interpolation) {
        // Fallback to simple step-based visibility
        return elementDepth <= Math.floor(currentStep) ? 1 : 0;
    }

    const { currentStepFloor, stepFraction } = interpolation;

    if (elementDepth === currentStepFloor) {
        // Element is being animated in
        return stepFraction;
    } else if (elementDepth < currentStepFloor) {
        // Element is fully visible
        return 1;
    } else {
        // Element is not yet visible
        return 0;
    }
};

/**
 * Generate CSS clip-path for revealing elements with interpolation
 */
export const getRevealClipPath = (interpolationFactor: number): string => {
    const revealPercent = interpolationFactor * 100;
    return `inset(0 0 ${100 - revealPercent}% 0)`;
};

/**
 * Check if an element should be visible based on its depth and current context
 */
export const isElementVisible = (
    elementDepth: number,
    context: VisualisationRenderContext
): boolean => {
    const { currentStep = 0 } = context.state;
    return elementDepth < Math.ceil(currentStep);
};
