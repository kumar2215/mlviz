/**
 * Scatter Plot Renderers - Barrel Export
 *
 * This file re-exports all scatter rendering functions and types from their
 * dimension-specific files. This provides a clean API and maintains backward
 * compatibility for existing imports.
 *
 * Organization:
 * - scatterRenderHelpers.ts: Shared utilities and types
 * - scatter1DRenderer.ts: 1D strip plot rendering
 * - scatter2DRenderer.ts: 2D scatter plot rendering
 */

// Re-export dimension-specific renderers
export { renderScatter1D } from "@/components/plots/dimensions/scatter1DrendererUtils";
export { renderScatter2D } from "@/components/plots/dimensions/scatter2DrendererUtils";
