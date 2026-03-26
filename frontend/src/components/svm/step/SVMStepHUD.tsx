import CollapsibleHUD from "@/components/visualisation/CollapsibleHUD";
import { useSVMContext } from "@/contexts/models/SVMContext";
import { useHistoryRecorder } from "@/hooks/useHistoryRecorder";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { Play } from "lucide-react";
import React, { useEffect, useId } from "react";

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
        performStep,
        stepData,
        currentW1,
        currentW2,
        currentBias,
        setManualWeights,
        computeHingeLoss,
        lastVisualizationParams,
        randomizeWeights
    } = useSVMContext();
    const { recordStep } = useHistoryRecorder();

    const w1Id = useId();
    const w2Id = useId();
    const biasId = useId();

    const fs = (n: number) => `${n * scaleFactor}px`;

    useEffect(() => {
        if (!stepData && mode === "preview") {
            performStep({ 
                ...lastVisualizationParams, 
                current_w1: currentW1, 
                current_w2: currentW2, 
                current_b: currentBias, 
                learning_rate: learningRate 
            });
        }
    }, [mode, stepData, currentW1, currentW2, currentBias, learningRate, lastVisualizationParams, performStep]);

    const handleStep = async () => {
        setMode("preview");
        await performStep({ 
            ...lastVisualizationParams, 
            current_w1: currentW1, 
            current_w2: currentW2, 
            current_b: currentBias, 
            learning_rate: learningRate 
        });
    };

    const handleAccept = () => {
        if (!stepData) return;
        setManualWeights(stepData.new_w1, stepData.new_w2, stepData.new_b);
        recordStep(
            { ...lastVisualizationParams, learning_rate: learningRate },
            { loss: stepData.loss, w1: stepData.new_w1, w2: stepData.new_w2, b: stepData.new_b }
        );
        setMode("idle");
    };

    const handleReject = () => {
        setMode("idle");
    };
    
    const handleRandomize = () => {
        randomizeWeights();
        setMode("idle");
    }

    return (
        <CollapsibleHUD
            icon={<Play style={{ width: fs(15), height: fs(15) }} className="text-emerald-500" />}
            title="Optimisation Step"
            defaultOpen={true}
            style={{ width: fs(240) }}
        >
            <div className="flex flex-col gap-3">
                {/* Weight sliders */}
                {[
                    { id: w1Id, label: "Weight w₁", value: currentW1, onChange: (v: number) => setManualWeights(v, currentW2, currentBias) },
                    { id: w2Id, label: "Weight w₂", value: currentW2, onChange: (v: number) => setManualWeights(currentW1, v, currentBias) },
                    { id: biasId, label: "Bias (b)", value: currentBias, onChange: (v: number) => setManualWeights(currentW1, currentW2, v) },
                ].map(({ id, label, value, onChange }) => (
                    <div key={id} className="flex flex-col gap-1">
                        <div className="flex justify-between">
                            <label htmlFor={id} className="text-slate-500 font-medium" style={{ fontSize: fs(11) }}>
                                {label}
                            </label>
                            <span className="font-mono text-indigo-600 font-bold" style={{ fontSize: fs(11) }}>
                                {value.toFixed(3)}
                            </span>
                        </div>
                        <input
                            id={id}
                            type="range"
                            min="-5"
                            max="5"
                            step="0.01"
                            value={value}
                            onChange={(e) => onChange(parseFloat(e.target.value))}
                            disabled={mode === "preview"}
                            className="w-full accent-indigo-500"
                            style={{ height: fs(4) }}
                        />
                    </div>
                ))}

                <div className="flex flex-col gap-1">
                    <label className="text-slate-500 font-medium" style={{ fontSize: fs(11) }}>
                        Learning Rate (α)
                    </label>
                    <input
                        type="range"
                        min="0.001"
                        max="0.5"
                        step="0.01"
                        value={learningRate}
                        onChange={(e) => onLearningRateChange(parseFloat(e.target.value))}
                        disabled={mode === "preview"}
                        className="w-full accent-emerald-500"
                        style={{ height: fs(4) }}
                    />
                    <div className="flex justify-between text-slate-400 font-mono" style={{ fontSize: fs(10) }}>
                        <span>0.001</span>
                        <span className="text-emerald-600 font-semibold">{learningRate.toFixed(3)}</span>
                        <span>0.5</span>
                    </div>
                </div>

                {mode === "idle" && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleRandomize}
                            className="flex-1 py-1 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors"
                            style={{ fontSize: fs(11) }}
                        >
                            Randomise
                        </button>
                        <button
                            onClick={handleStep}
                            className="flex-1 py-1 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md shadow-sm transition-colors"
                            style={{ fontSize: fs(11) }}
                        >
                            Step Gradient
                        </button>
                    </div>
                )}

                {mode === "preview" && (
                    <div className="flex flex-col gap-2">
                        <div className="p-2 bg-orange-50 border border-orange-100 rounded-md">
                            <p className="text-orange-800 font-medium mb-1" style={{ fontSize: fs(10) }}>
                                Proposed Update:
                            </p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-orange-900" style={{ fontSize: fs(10) }}>
                                <div className="text-right">Current Loss:</div>
                                <div>{computeHingeLoss(currentW1, currentW2, currentBias).toFixed(4)}</div>
                                <div className="text-right">New Loss:</div>
                                <div className="font-bold">{stepData?.loss?.toFixed(4) || "..."}</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleReject}
                                className="flex-1 py-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-md transition-colors"
                                style={{ fontSize: fs(11) }}
                            >
                                Reject
                            </button>
                            <button
                                onClick={handleAccept}
                                className="flex-1 py-1 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md shadow-sm transition-colors"
                                style={{ fontSize: fs(11) }}
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </CollapsibleHUD>
    );
};

export default SVMStepHUD;
