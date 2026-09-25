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
