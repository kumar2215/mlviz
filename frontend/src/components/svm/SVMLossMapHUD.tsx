/**
 * SVM Loss Map HUD
 * Wraps BaseLossMapHUD to visualize w1 and w2 parameters, 
 * computing Hinge Loss with a fixed currentBias.
 */
import BaseLossMapHUD, { type LossMapMode } from "@/components/visualisation/BaseLossMapHUD";
import { useSVMContext } from "@/contexts/models/SVMContext";
import React, { useMemo } from "react";

interface SVMLossMapHUDProps {
    mode?: LossMapMode;
}

const SVMLossMapHUD: React.FC<SVMLossMapHUDProps> = ({ mode }) => {
    const {
        currentW1,
        currentW2,
        currentBias,
        computeHingeLoss,
        stepData,
    } = useSVMContext();

    // Compute generic parameter bounds (could be dynamic or fixed for visualization)
    const bounds = useMemo(() => {
        const spread = 3;
        const w1Min = -spread;
        const w1Max = spread;
        const w2Min = -spread;
        const w2Max = spread;

        return {
            xRange: [w1Min, w1Max] as [number, number],
            yRange: [w2Min, w2Max] as [number, number],
        };
    }, []);

    // Create a stable compute function fixing the bias
    const computeFixedLoss = React.useCallback(
        (w1: number, w2: number) => computeHingeLoss(w1, w2, currentBias),
        [computeHingeLoss, currentBias]
    );

    return (
        <BaseLossMapHUD
            xRange={bounds.xRange}
            yRange={bounds.yRange}
            xLabel="Weight 1 (w1)"
            yLabel="Weight 2 (w2)"
            currentX={currentW1}
            currentY={currentW2}
            proposedX={stepData?.new_w1}
            proposedY={stepData?.new_w2}
            computeLoss={computeFixedLoss}
            mode={mode}
            extraInfo={<>(Fixed Bias b: {currentBias.toFixed(3)})</>}
        />
    );
};

export default SVMLossMapHUD;
