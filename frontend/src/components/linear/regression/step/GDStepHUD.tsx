/**
 * Gradient Descent Step HUD
 * Controls for the step-by-step gradient descent visualisation.
 * The user can: Run Step → see proposal → Accept / Reject.
 */
import { Button } from "@/components/ui/button";
import { useLinearRegression } from "@/contexts/models/LinearRegressionContext";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { ArrowRight, Check, Play, X } from "lucide-react";
import React from "react";

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
    const {
        currentSlope,
        currentIntercept,
        setCurrentLine,
        performStep,
        isStepLoading,
        stepData,
        visualizationData,
        computeR2,
    } = useLinearRegression();

    const fs = (n: number) => `${n * scaleFactor}px`;
    const points = visualizationData?.points ?? [];

    const handleRunStep = async () => {
        if (points.length === 0) return;
        await performStep({
            slope: currentSlope,
            intercept: currentIntercept,
            learning_rate: learningRate,
            fit_intercept: true,
            points,
        });
        setMode("preview");
    };

    const handleAccept = () => {
        if (stepData) {
            setCurrentLine(stepData.new_slope, stepData.new_intercept);
        }
        setMode("idle");
    };

    const handleReject = () => {
        setMode("idle");
    };

    const r2Before = stepData ? computeR2(stepData.slope, stepData.intercept) : computeR2(currentSlope, currentIntercept);
    const r2After = stepData ? computeR2(stepData.new_slope, stepData.new_intercept) : null;

    const r2Class = (v: number) =>
        v >= 0.9 ? "text-emerald-600" : v >= 0.7 ? "text-blue-600" : v >= 0.5 ? "text-amber-600" : "text-red-500";

    return (
        <div
            className="bg-gradient-to-br from-slate-50 to-indigo-50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200"
            style={{ padding: fs(20), width: fs(290) }}
        >
            <h3
                className="font-bold text-slate-800 flex items-center mb-4"
                style={{ gap: fs(8), fontSize: fs(15) }}
            >
                <ArrowRight
                    style={{ width: fs(15), height: fs(15) }}
                    className="text-indigo-500"
                />
                Gradient Descent
            </h3>

            {/* Learning Rate */}
            <div className="flex flex-col mb-4" style={{ gap: fs(4) }}>
                <div className="flex justify-between">
                    <span
                        className="text-slate-500 font-medium"
                        style={{ fontSize: fs(12) }}
                    >
                        Learning Rate
                    </span>
                    <span
                        className="font-mono text-indigo-600 font-bold"
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
                    className="w-full accent-indigo-500"
                />
            </div>

            {/* Current line info */}
            <div
                className="rounded-xl bg-white/70 border border-slate-100 mb-4"
                style={{ padding: fs(10), gap: fs(4) }}
            >
                <div className="flex flex-col" style={{ gap: fs(3) }}>
                    <span
                        className="uppercase tracking-widest text-slate-400 font-semibold"
                        style={{ fontSize: fs(9) }}
                    >
                        Current Line
                    </span>
                    <span style={{ fontSize: fs(11) }} className="font-mono text-slate-700">
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
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md transition-all active:scale-[0.98]"
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
                <div className="flex flex-col" style={{ gap: fs(8) }}>
                    <div
                        className="rounded-xl bg-white/70 border border-emerald-100"
                        style={{ padding: fs(10) }}
                    >
                        <span
                            className="uppercase tracking-widest text-slate-400 font-semibold block mb-1"
                            style={{ fontSize: fs(9) }}
                        >
                            Proposed Update
                        </span>
                        <span style={{ fontSize: fs(11) }} className="font-mono text-slate-700 block">
                            y = {stepData.new_slope.toFixed(4)}x{" "}
                            {stepData.new_intercept >= 0 ? "+" : ""}{stepData.new_intercept.toFixed(2)}
                        </span>
                        {r2After !== null && (
                            <span style={{ fontSize: fs(11) }} className={`font-mono font-bold block ${r2Class(r2After)}`}>
                                R² = {r2After.toFixed(4)}
                            </span>
                        )}
                        <div
                            className="flex justify-between mt-2 text-slate-400"
                            style={{ fontSize: fs(10) }}
                        >
                            <span>∇slope: {stepData.grad_slope.toFixed(4)}</span>
                            <span>∇intercept: {stepData.grad_intercept.toFixed(4)}</span>
                        </div>
                    </div>

                    <p
                        className="text-slate-500 text-center"
                        style={{ fontSize: fs(11) }}
                    >
                        Accept the proposed update?
                    </p>

                    <div className="flex" style={{ gap: fs(8) }}>
                        <Button
                            className="flex-1 bg-gradient-to-r from-emerald-100 to-teal-100 text-black border-none hover:from-emerald-200 hover:to-teal-200 shadow-md transition-all active:scale-[0.98]"
                            style={{ height: fs(38), gap: fs(6), fontSize: fs(12) }}
                            onClick={handleAccept}
                        >
                            <Check style={{ width: fs(14), height: fs(14) }} />
                            Accept
                        </Button>
                        <Button
                            className="flex-1 bg-gradient-to-r from-red-100 to-rose-100 text-black border-none hover:from-red-200 hover:to-rose-200 shadow-md transition-all active:scale-[0.98]"
                            style={{ height: fs(38), gap: fs(6), fontSize: fs(12) }}
                            onClick={handleReject}
                        >
                            <X style={{ width: fs(14), height: fs(14) }} />
                            Reject
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GDStepHUD;
export type { GDStepHUDProps };
