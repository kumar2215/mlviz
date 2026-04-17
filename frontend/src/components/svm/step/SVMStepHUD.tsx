import { Button } from "@/components/ui/button";
import RadialSlopeSlider from "@/components/linear/regression/RadialSlopeSlider";
import CollapsibleHUD from "@/components/visualisation/CollapsibleHUD";
import { useSVMContext } from "@/contexts/models/SVMContext";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { ArrowRight, Check, Play, RefreshCw, X } from "lucide-react";
import React, { useId } from "react";

export type SVMStepMode = "idle" | "preview";

interface SVMStepHUDProps {
    mode: SVMStepMode;
    setMode: (mode: SVMStepMode) => void;
    learningRate: number;
    onLearningRateChange: (lr: number) => void;
}

const SVMStepHUD: React.FC<SVMStepHUDProps> = ({
    mode,
    setMode,
    learningRate,
    onLearningRateChange,
}) => {
    const scaleFactor = useScaleFactor();
    const {
        currentW1,
        currentW2,
        currentBias,
        setManualWeights,
        performStep,
        isStepLoading,
        stepData,
        visualizationData,
        computeHingeLoss,
        lastVisualizationParams,
        makePrediction
    } = useSVMContext();

    const interceptId = useId();
    const widthId = useId();

    const fs = (n: number) => `${n * scaleFactor}px`;
    const points = visualizationData?.points ?? [];

    // Span for angle calculations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xRange = (visualizationData as any)?.x_range as [number, number] | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yRange = (visualizationData as any)?.y_range as [number, number] | undefined;
    const xSpan = xRange ? xRange[1] - xRange[0] : 10;
    const ySpan = yRange ? yRange[1] - yRange[0] : 10;

    // Derived properties
    const currentSlope = currentW2 !== 0 ? -currentW1 / currentW2 : (currentW1 < 0 ? 1000 : -1000);
    const intercept = currentW2 !== 0 ? -currentBias / currentW2 : 0;
    const norm = Math.max(1e-5, Math.sqrt(currentW1 * currentW1 + currentW2 * currentW2));
    const width = 2 / norm;
    
    // R² and Loss
    const lossBefore = stepData ? stepData.loss : computeHingeLoss(currentW1, currentW2, currentBias);
    const lossAfter = stepData ? stepData.loss : null;

    const handleUpdate = (newSlope: number, newIntercept: number, newWidth: number) => {
        const signW2 = currentW2 >= 0 ? 1 : -1;
        const normW = 2 / Math.max(1e-5, newWidth);
        const newW2 = signW2 * normW / Math.sqrt(newSlope * newSlope + 1);
        const newW1 = -newSlope * newW2;
        const newB = -newIntercept * newW2;
        setManualWeights(newW1, newW2, newB);
    };

    const handleFlip = () => {
        setManualWeights(-currentW1, -currentW2, -currentBias);
    };

    const handleRunStep = async () => {
        if (points.length === 0) return;
        
        // SVMStepRequest requires parameters
        const request = {
            current_w1: currentW1,
            current_w2: currentW2,
            current_b: currentBias,
            learning_rate: learningRate,
            parameters: lastVisualizationParams.parameters || { feature_x: 0, feature_y: 1, C: 1.0, margin_type: "soft", max_iterations: 500 },
            dataset: lastVisualizationParams.dataset
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await performStep(request as any);
        setMode("preview");
    };

    const handleAccept = () => {
        if (stepData) {
            setManualWeights(stepData.new_w1, stepData.new_w2, stepData.new_b);
            makePrediction({
                ...lastVisualizationParams,
                w1: stepData.new_w1,
                w2: stepData.new_w2,
                b: stepData.new_b
            });
        }
        setMode("idle");
    };

    const handleReject = () => {
        setMode("idle");
    };

    const lossClass = (v: number) =>
        v <= 0.1 ? "text-emerald-600" : v <= 0.3 ? "text-blue-600" : v <= 0.8 ? "text-amber-600" : "text-red-500";

    return (
        <CollapsibleHUD
            icon={<ArrowRight style={{ width: fs(15), height: fs(15) }} className="text-indigo-500" />}
            title="Subgradient Descent"
            style={{ width: fs(290) }}
        >
            {/* Learning Rate */}
            <div className="flex flex-col mb-4" style={{ gap: fs(4) }}>
                <div className="flex justify-between">
                    <span className="text-slate-500 font-medium" style={{ fontSize: fs(12) }}>
                        Learning Rate
                    </span>
                    <span className="font-mono text-indigo-600 font-bold" style={{ fontSize: fs(12) }}>
                        {learningRate.toFixed(4)}
                    </span>
                </div>
                <input
                    type="range"
                    min={0.001}
                    max={0.5}
                    step={0.001}
                    value={learningRate}
                    onChange={(e) => onLearningRateChange(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                />
            </div>

            {/* Geometry Controls (Idle Mode Only) */}
            {mode === "idle" && (
                <>
                    <div className="rounded-xl bg-white/70 border border-slate-100 mb-4" style={{ padding: fs(10), gap: fs(4) }}>
                        {/* Margin Width */}
                        <div className="flex flex-col mb-4" style={{ gap: fs(4) }}>
                            <div className="flex justify-between">
                                <label htmlFor={widthId} className="text-slate-500 font-medium" style={{ fontSize: fs(12) }}>
                                    Margin Width
                                </label>
                                <span className="font-mono text-indigo-600 font-bold" style={{ fontSize: fs(12) }}>
                                    {width.toFixed(2)}
                                </span>
                            </div>
                            <input
                                id={widthId}
                                type="range"
                                min={0.1}
                                max={10}
                                step={0.1}
                                value={width}
                                onChange={(e) => handleUpdate(currentSlope, intercept, parseFloat(e.target.value))}
                                className="w-full accent-indigo-500"
                            />
                        </div>

                        {/* Intercept */}
                        <div className="flex flex-col mb-4" style={{ gap: fs(4) }}>
                            <div className="flex justify-between">
                                <label htmlFor={interceptId} className="text-slate-500 font-medium" style={{ fontSize: fs(12) }}>
                                    Intercept (b)
                                </label>
                                <span className="font-mono text-indigo-600 font-bold" style={{ fontSize: fs(12) }}>
                                    {intercept.toFixed(1)}
                                </span>
                            </div>
                            <input
                                id={interceptId}
                                type="range"
                                min={-10}
                                max={10}
                                step={0.1}
                                value={intercept}
                                onChange={(e) => handleUpdate(currentSlope, parseFloat(e.target.value), width)}
                                className="w-full accent-indigo-500"
                            />
                        </div>

                        {/* Radial Slope */}
                        <div className="flex flex-col items-center mb-2" style={{ gap: fs(2) }}>
                            <div className="flex justify-between w-full" style={{ marginBottom: fs(2) }}>
                                <span className="text-slate-500 font-medium" style={{ fontSize: fs(12) }}>
                                    Slope
                                </span>
                                <span className="font-mono text-indigo-600 font-bold" style={{ fontSize: fs(12) }}>
                                    {currentSlope.toFixed(2)}
                                </span>
                            </div>
                            <RadialSlopeSlider
                                slope={currentSlope}
                                onSlopeChange={(s) => handleUpdate(s, intercept, width)}
                                xSpan={xSpan}
                                ySpan={ySpan}
                                size={Math.round(230 * scaleFactor)}
                            />
                        </div>

                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full mt-2" 
                            onClick={handleFlip}
                            style={{ height: fs(30), fontSize: fs(11) }}
                        >
                            <RefreshCw style={{ width: fs(12), height: fs(12), marginRight: fs(6) }} />
                            Swap Margins (+ / -)
                        </Button>
                    </div>
                </>
            )}

            {/* Current State Indicator */}
            <div className="rounded-xl bg-white/70 border border-slate-100 mb-4 flex justify-between items-center" style={{ padding: fs(10) }}>
                <div className="flex flex-col" style={{ gap: fs(3) }}>
                    <span className="uppercase tracking-widest text-slate-400 font-semibold" style={{ fontSize: fs(9) }}>
                        Current Model
                    </span>
                    <span style={{ fontSize: fs(11) }} className="font-mono text-slate-700">
                        w = [{currentW1.toFixed(2)}, {currentW2.toFixed(2)}]
                    </span>
                    <span style={{ fontSize: fs(11) }} className={`font-mono font-bold ${lossClass(lossBefore)}`}>
                        Hinge Loss = {lossBefore.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Idle mode triggers Run Step */}
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

            {/* Preview mode shows proposal */}
            {mode === "preview" && stepData && (
                <div className="flex flex-col" style={{ gap: fs(8) }}>
                    <div className="rounded-xl bg-white/70 border border-emerald-100" style={{ padding: fs(10) }}>
                        <span className="uppercase tracking-widest text-slate-400 font-semibold block mb-1" style={{ fontSize: fs(9) }}>
                            Proposed Update
                        </span>
                        <span style={{ fontSize: fs(11) }} className="font-mono text-slate-700 block mt-2">
                            w = [{stepData.new_w1.toFixed(2)}, {stepData.new_w2.toFixed(2)}]
                        </span>
                        <div className="flex justify-between mt-1 text-slate-400 font-mono" style={{ fontSize: fs(10) }}>
                            <span>∇ = [{(currentW1 - stepData.new_w1).toFixed(3)}, {(currentW2 - stepData.new_w2).toFixed(3)}]</span>
                        </div>
                        {lossAfter !== null && (
                            <span style={{ fontSize: fs(11) }} className={`font-mono font-bold block mt-2 ${lossClass(lossAfter)}`}>
                                Hinge Loss = {lossAfter.toFixed(2)}
                            </span>
                        )}
                    </div>

                    <p className="text-slate-500 text-center" style={{ fontSize: fs(11) }}>
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
        </CollapsibleHUD>
    );
};

export default SVMStepHUD;
