/**
 * Centralized zoom configuration for scatter plots
 * Provides consistent zoom behavior across all visualizations
 */

export interface ZoomConfig {
    scaleExtent: [number, number];
    enableReset: boolean;
    enablePan: boolean;
    panMargin: number;
    contentBounds: {
        width: number;
        height: number;
    };
}

/**
 * Default zoom configuration for 2D scatter plots
 * - scaleExtent: [1.0, 5] prevents zooming out beyond initial view, allows 5x zoom in
 * - panMargin: 50px allows some panning beyond content edges when zoomed out
 * - contentBounds: Will be automatically updated by BaseVisualisation with actual dimensions
 */
export const DEFAULT_2D_ZOOM_CONFIG: ZoomConfig = {
    scaleExtent: [1.0, 5],
    enableReset: true,
    enablePan: true,
    panMargin: 0,
    contentBounds: {
        width: 800 - 60,  // Default width minus typical margins
        height: 600 - 90, // Default height minus typical margins
    },
};

/**
 * Relaxed zoom configuration for exploratory analysis
 * - Allows zooming out to 0.5x for overview
 * - Larger pan margin for more freedom
 */
export const EXPLORATORY_ZOOM_CONFIG: ZoomConfig = {
    scaleExtent: [0.5, 10],
    enableReset: true,
    enablePan: true,
    panMargin: 20,
    contentBounds: {
        width: 800 - 60,
        height: 600 - 90,
    },
};

/**
 * Strict zoom configuration for precise interactions
 * - No zoom out beyond initial view
 * - Zero pan margin to keep absolute focus on content
 */
export const STRICT_ZOOM_CONFIG: ZoomConfig = {
    scaleExtent: [1.0, 3],
    enableReset: true,
    enablePan: true,
    panMargin: 0,
    contentBounds: {
        width: 800 - 60,
        height: 600 - 90,
    },
};

/**
 * Create a custom zoom configuration by merging with defaults
 */
export function createZoomConfig(overrides?: Partial<ZoomConfig>): ZoomConfig {
    return {
        ...DEFAULT_2D_ZOOM_CONFIG,
        ...overrides,
        contentBounds: {
            ...DEFAULT_2D_ZOOM_CONFIG.contentBounds,
            ...overrides?.contentBounds,
        },
    };
}
