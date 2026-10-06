/**
 * Shared color utilities for all visualizations across the project
 * Used by plots, histograms, decision trees, and other visualizations
 */

import * as d3 from "d3";

/**
 * Default grey color used for "Unassigned" labels or null values
 */
export const UNASSIGNED_COLOR = "#999999";

// ============================================================================
// Color Palettes
// ============================================================================

/**
 * Default color palette - consistent across histograms, plots, and other visualizations
 * Based on a subset of d3.schemeCategory10 with adjustments
 */
export const DEFAULT_COLORS = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // olive
    "#17becf", // cyan
];

/**
 * Additional color palettes for different visualization needs
 */
const COLOR_PALETTES = {
    default: DEFAULT_COLORS,
    category10: d3.schemeCategory10,
    dark2: d3.schemeDark2,
    set3: d3.schemeSet3,
    paired: d3.schemePaired,
    pastel1: d3.schemePastel1,
} as const;

export type PaletteName = keyof typeof COLOR_PALETTES;

// ============================================================================
// Color Scale Creation
// ============================================================================

/**
 * Creates a D3 ordinal color scale from labels
 * @param labels Array of unique labels
 * @param palette Name of the color palette to use
 * @returns D3 ordinal color scale
 */
export function createColorScale(
    labels: string[],
    palette: PaletteName = "default"
): d3.ScaleOrdinal<string, string> {
    const colors = COLOR_PALETTES[palette];

    // Create base range of colors
    const range = colors.slice(0, Math.max(labels.length, colors.length));

    // Explicitly handle "Unassigned" if present in labels
    const unassignedIndex = labels.indexOf("Unassigned");
    if (unassignedIndex !== -1) {
        // Ensure the range has enough slots
        if (unassignedIndex < range.length) {
            range[unassignedIndex] = UNASSIGNED_COLOR;
        }
    }

    return d3
        .scaleOrdinal<string>()
        .domain(labels)
        .range(range);
}

// ============================================================================
// Continuous Color Scales (for Regression)
// ============================================================================

/**
 * Available continuous color schemes for regression tasks
 */
const CONTINUOUS_COLOR_SCHEMES = {
    viridis: d3.interpolateViridis,
    plasma: d3.interpolatePlasma,
    inferno: d3.interpolateInferno,
    magma: d3.interpolateMagma,
    cividis: d3.interpolateCividis,
    blues: d3.interpolateBlues,
    greens: d3.interpolateGreens,
    reds: d3.interpolateReds,
    purples: d3.interpolatePurples,
    oranges: d3.interpolateOranges,
    greys: d3.interpolateGreys,
    turbo: d3.interpolateTurbo,
    cool: d3.interpolateCool,
    warm: d3.interpolateWarm,
} as const;

export type ContinuousSchemeName = keyof typeof CONTINUOUS_COLOR_SCHEMES;

/**
 * Creates a D3 sequential color scale for continuous data (regression)
 * @param domain Value range [min, max]
 * @param scheme Name of the continuous color scheme
 * @returns D3 sequential color scale
 */
export function createContinuousColorScale(
    domain: [number, number],
    scheme: ContinuousSchemeName = "viridis"
): d3.ScaleSequential<string> {
    const interpolator = CONTINUOUS_COLOR_SCHEMES[scheme];
    return d3.scaleSequential(interpolator).domain(domain);
}
