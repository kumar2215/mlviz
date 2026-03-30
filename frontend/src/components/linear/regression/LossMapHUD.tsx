/**
 * Loss Map HUD for Linear Regression
 * Wraps the generic BaseLossMapHUD to provide MSE loss landscape for Slope vs Intercept.
 */
import BaseLossMapHUD, { type LossMapMode } from "@/components/visualisation/BaseLossMapHUD";
import { useLinearRegression } from "@/contexts/models/LinearRegressionContext";
import React, { useMemo } from "react";

interface LossMapHUDProps {
    mode?: LossMapMode;
}

const LossMapHUD: React.FC<LossMapHUDProps> = ({ mode }) => {
    const {
        visualizationData,
        currentSlope,
        currentIntercept,
        computeMSE,
        stepData,
    } = useLinearRegression();

    // Compute bounds once based on data
    const bounds = useMemo(() => {
        if (!visualizationData?.points?.length) return null;

        const xRange = (visualizationData as any).x_range as [number, number];
        const yRange = (visualizationData as any).y_range as [number, number];
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];

        const naturalSlope = ySpan / xSpan;
        const slopeMin = -naturalSlope * 1.5;
        const slopeMax = naturalSlope * 1.5;
        const interceptMin = yRange[0] - ySpan * 0.5;
        const interceptMax = yRange[1] + ySpan * 0.5;

        return {
            xRange: [slopeMin, slopeMax] as [number, number],
            yRange: [interceptMin, interceptMax] as [number, number],
        };
    }, [visualizationData]);

    if (!bounds) {
        // Render empty state if no bounds
        return (
            <BaseLossMapHUD
                xRange={[0, 1]}
                yRange={[0, 1]}
                xLabel="Slope (m)"
                yLabel="Intercept (b)"
                currentX={currentSlope}
                currentY={currentIntercept}
                computeLoss={computeMSE}
                mode={mode}
            />
        );
    }

    return (
        <BaseLossMapHUD
            xRange={bounds.xRange}
            yRange={bounds.yRange}
            xLabel="Slope (m)"
            yLabel="Intercept (b)"
            currentX={currentSlope}
            currentY={currentIntercept}
            proposedX={stepData?.new_slope}
            proposedY={stepData?.new_intercept}
            computeLoss={computeMSE}
            mode={mode}
        />
    );
};

export default LossMapHUD;
