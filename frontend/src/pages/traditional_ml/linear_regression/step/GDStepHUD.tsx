/**
 * Gradient Descent Step HUD
 * Controls for the step-by-step gradient descent visualisation.
 * The user can: Run Step → see proposal → Accept / Reject.
 */
import { Button } from "@/components/ui/button";
import CollapsibleHUD from "@/components/visualisation/CollapsibleHUD";
import { useLinearRegression } from "@/store/traditional_ml/useLinearRegression";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { ArrowRight, Check, Play, X } from "lucide-react";
import React from "react";
import { captureTourAction } from "@/store/tourStore";

export type GDStepMode = "idle" | "preview";

interface GDStepHUDProps {
    mode: GDStepMode;
    setMode: (mode: GDStepMode) => void;
    learningRate: number;
    onLearningRateChange: (lr: number) => void;
}

const GDStepHUD: React.FC<GDStepHUDProps> = ({
    mode,
    setMode,
    learningRate,
    onLearningRateChange,
}) => {
    const scaleFactor = useScaleFactor();
    const currentSlope = useLinearRegression(state => state.currentSlope);
    const currentIntercept = useLinearRegression(state => state.currentIntercept);
    const setCurrentLine = useLinearRegression(state => state.setCurrentLine);
    const performStep = useLinearRegression(state => state.performStep);
    const isStepLoading = useLinearRegression(state => state.isStepLoading);
    const stepData = useLinearRegression(state => state.stepData);
    const visualizationData = useLinearRegression(state => state.visualizationData);
    const computeR2 = useLinearRegression(state => state.computeR2);

    const fs = (n: number) => `${n * scaleFactor}px`;
    const points = visualizationData?.points ?? [];

    const handleRunStep = async () => {
        if (points.length === 0) return;
        const finish = captureTourAction("run-step");
        const result = await performStep({
            slope: currentSlope,
            intercept: currentIntercept,
            learning_rate: learningRate,
            fit_intercept: true,
            points,
        });
        if (result) setMode("preview");
        finish(Boolean(result));
    };

    const handleAccept = () => {
        const finish = captureTourAction("resolve-step");
        if (stepData) {
            setCurrentLine(stepData.new_slope, stepData.new_intercept);
        }
        setMode("idle");
        finish(Boolean(stepData));
    };

    const handleReject = () => {
        const finish = captureTourAction("resolve-step");
        setMode("idle");
        finish(Boolean(stepData));
    };

    const r2Before = stepData ? computeR2(stepData.slope, stepData.intercept) : computeR2(currentSlope, currentIntercept);
    const r2After = stepData ? computeR2(stepData.new_slope, stepData.new_intercept) : null;

    const r2Class = (v: number) =>
        v >= 0.9 ? "text-success-foreground" : v >= 0.7 ? "text-primary" : v >= 0.5 ? "text-warning-foreground" : "text-danger-foreground";

    return (
        <CollapsibleHUD
            tourTarget="step-controls"
            icon={<ArrowRight style={{ width: fs(15), height: fs(15) }} className="text-primary" />}
            title="Gradient Descent"
            style={{ width: fs(290) }}
        >
            {/* Learning Rate */}
            <div className="flex flex-col mb-4" style={{ gap: fs(4) }}>
                <div className="flex justify-between">
                    <span
                        className="text-text-secondary font-medium"
                        style={{ fontSize: fs(12) }}
                    >
                        Learning Rate
                    </span>
                    <span
                        className="font-mono text-primary font-bold"
                        style={{ fontSize: fs(12) }}
                    >
                        {learningRate.toFixed(4)}
                    </span>
                </div>
                <input
                    type="range"
                    min={0.0001}
                    max={0.5}
                    step={0.0001}
                    value={learningRate}
                    onChange={(e) => onLearningRateChange(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                />
            </div>

            {/* Current line info */}
            <div
                className="rounded-xl bg-surface-hover-translucent border border-border mb-4"
                style={{ padding: fs(10), gap: fs(4) }}
            >
                <div className="flex flex-col" style={{ gap: fs(3) }}>
                    <span
                        className="uppercase tracking-widest text-text-secondary font-semibold"
                        style={{ fontSize: fs(9) }}
                    >
                        Current Line
                    </span>
                    <span style={{ fontSize: fs(11) }} className="font-mono text-foreground">
                        y = {currentSlope.toFixed(4)}x{" "}
                        {currentIntercept >= 0 ? "+" : ""}{currentIntercept.toFixed(2)}
                    </span>
                    <span style={{ fontSize: fs(11) }} className={`font-mono font-bold ${r2Class(r2Before)}`}>
                        R² = {r2Before.toFixed(4)}
                    </span>
                </div>
            </div>

            {/* Idle mode */}
            {mode === "idle" && (
                <Button
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground border-none shadow-md transition-all active:scale-[0.98]"
                    style={{ height: fs(40), fontSize: fs(13), gap: fs(8) }}
                    onClick={handleRunStep}
                    disabled={isStepLoading || points.length === 0}
                >
                    <Play style={{ width: fs(14), height: fs(14) }} className="fill-current" />
                    {isStepLoading ? "Computing…" : "Run Step"}
                </Button>
            )}

            {/* Preview mode */}
            {mode === "preview" && stepData && (
                <div data-tour="step-proposal" className="flex flex-col" style={{ gap: fs(8) }}>
                    <div
                        className="rounded-xl bg-surface border border-chart-proposal"
                        style={{ padding: fs(10) }}
                    >
                        <span
                            className="uppercase tracking-widest text-text-secondary font-semibold block mb-1"
                            style={{ fontSize: fs(9) }}
                        >
                            Proposed Update
                        </span>
                        <span style={{ fontSize: fs(11) }} className="font-mono text-foreground block">
                            y = {stepData.new_slope.toFixed(4)}x{" "}
                            {stepData.new_intercept >= 0 ? "+" : ""}{stepData.new_intercept.toFixed(2)}
                        </span>
                        {r2After !== null && (
                            <span style={{ fontSize: fs(11) }} className={`font-mono font-bold block ${r2Class(r2After)}`}>
                                R² = {r2After.toFixed(4)}
                            </span>
                        )}
                        <div
                            className="flex justify-between mt-2 text-text-secondary"
                            style={{ fontSize: fs(10) }}
                        >
                            <span>∇slope: {stepData.grad_slope.toFixed(4)}</span>
                            <span>∇intercept: {stepData.grad_intercept.toFixed(4)}</span>
                        </div>
                    </div>

                    <p
                        className="text-text-secondary text-center"
                        style={{ fontSize: fs(11) }}
                    >
                        Accept the proposed update?
                    </p>

                    <div className="flex" style={{ gap: fs(8) }}>
                        <Button
                            className="flex-1 bg-success   text-success-foreground border-none   shadow-md transition-all active:scale-[0.98] hover:bg-success-hover "
                            style={{ height: fs(38), gap: fs(6), fontSize: fs(12) }}
                            onClick={handleAccept}
                        >
                            <Check style={{ width: fs(14), height: fs(14) }} />
                            Accept
                        </Button>
                        <Button
                            className="flex-1 bg-danger   text-danger-foreground border-none   shadow-md transition-all active:scale-[0.98] hover:bg-danger-hover "
                            style={{ height: fs(38), gap: fs(6), fontSize: fs(12) }}
                            onClick={handleReject}
                        >
                            <X style={{ width: fs(14), height: fs(14) }} />
                            Reject
                        </Button>
                    </div>
                </div>
            )}
        </CollapsibleHUD>
    );
};

export default GDStepHUD;
;
