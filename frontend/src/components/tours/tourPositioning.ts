import type { FloatingOptions } from "react-joyride";

export const TOUR_VIEWPORT_PADDING = 20;

/** A full-height plot may leave no space above or below: allow shifting on both axes. */
export const tourFloatingOptions: FloatingOptions = {
    strategy: "fixed",
    flipOptions: {
        boundary: [],
        rootBoundary: "viewport",
        padding: TOUR_VIEWPORT_PADDING,
        crossAxis: true,
        fallbackPlacements: ["top", "right", "left"],
        fallbackStrategy: "bestFit",
    },
    shiftOptions: {
        boundary: [],
        rootBoundary: "viewport",
        padding: TOUR_VIEWPORT_PADDING,
        mainAxis: true,
        crossAxis: true,
    },
    autoUpdate: { ancestorScroll: true, ancestorResize: true, elementResize: true, layoutShift: true },
};
