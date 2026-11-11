import * as d3 from "d3";
import { chartColors, mascotColors, uiColors } from "./colors.ts";

/** Shared recipes also use concrete sRGB values, safe for D3 and exported SVGs. */
export const colourRecipes = {
    tooltipShadow: `0 4px 12px ${uiColors.shadow}`,
    tooltipBorder: `1px solid ${uiColors.border}`,
    supportBorder: `1.5px solid ${uiColors.foreground}`,
    controlShadow: `drop-shadow(0 2px 4px ${uiColors.shadowStrong})`,
    currentGlow: `drop-shadow(0 0 4px ${uiColors.primaryGlow})`,
    rewardGlowOff: `0 0 0 0 ${uiColors.transparent}`,
    rewardGlowOn: `0 0 0 6px ${uiColors.rewardGlow}`,
    confetti: [uiColors.primary, uiColors.brand, mascotColors.accent, uiColors.rewardSpark, uiColors.rewardMeter],
} as const;

export const lossInterpolator = d3.interpolateYlOrBr;

export function lossGradient() {
    return `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => `${lossInterpolator(i / 8)} ${i / 8 * 100}%`).join(", ")})`;
}

export function playbackGradient(progress: number) {
    const percent = Math.max(0, Math.min(100, progress));
    return `linear-gradient(to right, ${uiColors.successStrong} 0%, ${chartColors.fitted} ${percent}%, ${uiColors.disabledForeground} ${percent}%, ${uiColors.mutedForeground} 100%)`;
}
