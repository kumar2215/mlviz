/**
 * Shared color utilities for all visualizations across the project
 * Used by plots, histograms, decision trees, and other visualizations
 */

import * as d3 from "d3";
import { categoricalPalettes, chartColors, continuousSchemes } from "../theme/colors.ts";

/**
 * Default grey color used for "Unassigned" labels or null values
 */
export const UNASSIGNED_COLOR = chartColors.unassigned;

// ============================================================================
// Color Palettes
// ============================================================================

/**
 * Default color palette - consistent across histograms, plots, and other visualizations
 * Based on a subset of d3.schemeCategory10 with adjustments
 */
export const DEFAULT_COLORS: string[] = [...categoricalPalettes.default];

const COLOR_PALETTES = {
    default: DEFAULT_COLORS,
    category10: DEFAULT_COLORS,
    dark2: [...categoricalPalettes.dark2],
    set3: [...categoricalPalettes.set3],
    paired: [...categoricalPalettes.paired],
    pastel1: [...categoricalPalettes.pastel1],
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
const interpolators = {
    Cividis: d3.interpolateCividis,
    YlOrBr: d3.interpolateYlOrBr,
    Blues: d3.interpolateBlues,
    Greens: d3.interpolateGreens,
    Reds: d3.interpolateReds,
    Oranges: d3.interpolateOranges,
    Greys: d3.interpolateGreys,
} as const;
const CONTINUOUS_COLOR_SCHEMES = Object.fromEntries(
    Object.entries(continuousSchemes).map(([name, scheme]) => [name, interpolators[scheme]]),
) as Record<keyof typeof continuousSchemes, (t: number) => string>;

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
