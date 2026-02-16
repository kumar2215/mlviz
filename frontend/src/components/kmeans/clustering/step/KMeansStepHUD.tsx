import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useKMeans } from "@/contexts/models/KMeansContext";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { Check, Move, Play, Plus, RotateCcw, Target } from "lucide-react";
import React from "react";

export type KMeansStepMode = "ready" | "selecting" | "preview";

interface KMeansStepHUDProps {
    mode: KMeansStepMode;
    setMode: (mode: KMeansStepMode) => void;
}

const KMeansStepHUD: React.FC<KMeansStepHUDProps> = ({ mode, setMode }) => {
    const scaleFactor = useScaleFactor();
    const {
        selectedCentroids,
        setSelectedCentroids,
        performStep,
        isStepLoading,
        stepData,
        lastVisualizationParams,
    } = useKMeans();

    const handleRunStep = async () => {
        if (selectedCentroids.length === 0) return;
        
        // Safety cast for parameters access
        const params = (lastVisualizationParams as any)?.parameters;
        const includeBoundary = params?.include_boundary !== false;

        await performStep({
            ...lastVisualizationParams,
            centroids: selectedCentroids,
            include_boundary: includeBoundary,
        } as any);
        setMode("preview");
    };

    const handleTrainNext = () => {
        if (stepData?.new_centroids) {
            setSelectedCentroids(stepData.new_centroids);
        }
        setMode("selecting");
    };

    return (
        <div
            className="bg-gradient-to-br from-blue-50 to-purple-50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200"
            style={{
                padding: `${20 * scaleFactor}px`,
                width: `${288 * scaleFactor}px`, // Equivalent to w-72
            }}
        >
            <h3
                className="font-bold text-slate-800 flex items-center mb-4"
                style={{
                    gap: `${8 * scaleFactor}px`,
                    fontSize: `${16 * scaleFactor}px`,
                }}
            >
                <Target
                    style={{
                        width: `${16 * scaleFactor}px`,
                        height: `${16 * scaleFactor}px`,
                    }}
                    className="text-primary"
                />
                Step-by-Step Training
            </h3>

            <div style={{ gap: `${16 * scaleFactor}px` }} className="flex flex-col">
                {mode === "ready" && (
                    <div style={{ gap: `${12 * scaleFactor}px` }} className="flex flex-col">
                        <p
                            className="text-slate-500 leading-relaxed"
                            style={{ fontSize: `${14 * scaleFactor}px` }}
                        >
                            {selectedCentroids.length > 0
                                ? "Continue from your saved state or start fresh."
                                : "Start by choosing initial points as cluster centers."}
                        </p>
                        {selectedCentroids.length > 0 ? (
                            <div style={{ gap: `${8 * scaleFactor}px` }} className="flex flex-col">
                                <Button
                                    className="w-full bg-slate-900 text-white border-none hover:bg-slate-700 shadow-md transition-all active:scale-[0.98]"
                                    style={{
                                        gap: `${8 * scaleFactor}px`,
                                        height: `${40 * scaleFactor}px`,
                                        fontSize: `${14 * scaleFactor}px`,
                                    }}
                                    onClick={() => setMode("selecting")}
                                >
                                    <Move
                                        style={{
                                            width: `${16 * scaleFactor}px`,
                                            height: `${16 * scaleFactor}px`,
                                        }}
                                    />{" "}
                                    Adjust Centroids
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full shadow-sm transition-all active:scale-[0.98]"
                                    style={{
                                        gap: `${8 * scaleFactor}px`,
                                        height: `${40 * scaleFactor}px`,
                                        fontSize: `${14 * scaleFactor}px`,
                                    }}
                                    onClick={handleRunStep}
                                    disabled={isStepLoading}
                                >
                                    <Play
                                        style={{
                                            width: `${16 * scaleFactor}px`,
                                            height: `${16 * scaleFactor}px`,
                                        }}
                                    />{" "}
                                    Run Step
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full text-slate-400 hover:text-slate-600"
                                    style={{
                                        fontSize: `${12 * scaleFactor}px`,
                                        height: `${32 * scaleFactor}px`,
                                    }}
                                    onClick={() => {
                                        setSelectedCentroids([]);
                                        setMode("selecting");
                                    }}
                                >
                                    <RotateCcw
                                        style={{
                                            width: `${12 * scaleFactor}px`,
                                            height: `${12 * scaleFactor}px`,
                                            marginRight: `${4 * scaleFactor}px`,
                                        }}
                                    />{" "}
                                    Start Over (Clear)
                                </Button>
                            </div>
                        ) : (
                            <Button
                                className="w-full bg-slate-900 border-none hover:bg-slate-700 text-white shadow-md transition-all active:scale-[0.98]"
                                style={{
                                    gap: `${8 * scaleFactor}px`,
                                    height: `${40 * scaleFactor}px`,
                                    fontSize: `${14 * scaleFactor}px`,
                                }}
                                onClick={() => setMode("selecting")}
                            >
                                <Plus
                                    style={{
                                        width: `${16 * scaleFactor}px`,
                                        height: `${16 * scaleFactor}px`,
                                    }}
                                />{" "}
                                Start Placing
                            </Button>
                        )}
                    </div>
                )}

                {mode === "selecting" && (
                    <div style={{ gap: `${12 * scaleFactor}px` }} className="flex flex-col">
                        <div className="flex justify-between items-end">
                            <Label
                                className="font-bold uppercase tracking-wider text-slate-400"
                                style={{ fontSize: `${10 * scaleFactor}px` }}
                            >
                                Centroids Placed
                            </Label>
                            <span
                                className="font-mono font-bold text-primary leading-none"
                                style={{ fontSize: `${18 * scaleFactor}px` }}
                            >
                                {selectedCentroids.length}
                            </span>
                        </div>
                        <p
                            className="text-slate-500 italic"
                            style={{ fontSize: `${12 * scaleFactor}px` }}
                        >
                            Click data points to select/deselect them.
                        </p>
                        <Button
                            className="w-full h-auto bg-gradient-to-r from-green-100 to-blue-100 text-black border-none hover:from-green-200 hover:to-blue-200 shadow-md transition-all active:scale-[0.98] whitespace-normal text-center flex items-center justify-center"
                            style={{
                                padding: `${8 * scaleFactor}px`,
                                gap: `${8 * scaleFactor}px`,
                            }}
                            disabled={selectedCentroids.length === 0 || isStepLoading}
                            onClick={handleRunStep}
                        >
                            {isStepLoading ? (
                                <span style={{ fontSize: `${14 * scaleFactor}px` }}>
                                    Computing...
                                </span>
                            ) : (
                                <>
                                    <Play
                                        className="fill-current shrink-0"
                                        style={{
                                            width: `${16 * scaleFactor}px`,
                                            height: `${16 * scaleFactor}px`,
                                        }}
                                    />{" "}
                                    <span
                                        style={{
                                            fontSize: `${12 * scaleFactor}px`,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Run Step
                                    </span>
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-400 hover:text-slate-600"
                            style={{
                                fontSize: `${12 * scaleFactor}px`,
                                height: `${32 * scaleFactor}px`,
                            }}
                            onClick={() => setSelectedCentroids([])}
                        >
                            <RotateCcw
                                style={{
                                    width: `${12 * scaleFactor}px`,
                                    height: `${12 * scaleFactor}px`,
                                    marginRight: `${4 * scaleFactor}px`,
                                }}
                            />{" "}
                            Clear All
                        </Button>
                    </div>
                )}

                {mode === "preview" && (
                    <div style={{ gap: `${12 * scaleFactor}px` }} className="flex flex-col">
                        <div
                            className="border border-primary/10 bg-white/50"
                            style={{
                                padding: `${12 * scaleFactor}px`,
                                borderRadius: `${12 * scaleFactor}px`,
                            }}
                        >
                            <p
                                className="font-medium text-primary flex items-center"
                                style={{
                                    gap: `${6 * scaleFactor}px`,
                                    fontSize: `${12 * scaleFactor}px`,
                                }}
                            >
                                <div
                                    className="rounded-full bg-primary animate-pulse"
                                    style={{
                                        width: `${6 * scaleFactor}px`,
                                        height: `${6 * scaleFactor}px`,
                                    }}
                                />
                                Step Complete
                            </p>
                            <p
                                className="text-slate-500 mt-1"
                                style={{ fontSize: `${11 * scaleFactor}px` }}
                            >
                                The algorithm has proposed new centers based on the current
                                assignments.
                            </p>
                        </div>
                        <div
                            className="text-slate-500 px-1"
                            style={{ fontSize: `${12 * scaleFactor}px` }}
                        >
                            Would you like to keep the centroids suggested?
                        </div>
                        <div
                            className="flex flex-row w-full pt-1"
                            style={{ gap: `${8 * scaleFactor}px` }}
                        >
                            <Button
                                className="w-1/2 h-auto bg-gradient-to-r from-green-100 to-blue-100 text-black border-none hover:from-green-200 hover:to-blue-200 shadow-md transition-all active:scale-[0.98] whitespace-normal text-center flex items-center justify-center"
                                style={{
                                    padding: `${8 * scaleFactor}px`,
                                    gap: `${8 * scaleFactor}px`,
                                }}
                                onClick={() => setMode("selecting")}
                            >
                                <Check
                                    className="shrink-0"
                                    style={{
                                        width: `${16 * scaleFactor}px`,
                                        height: `${16 * scaleFactor}px`,
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: `${12 * scaleFactor}px`,
                                        fontWeight: 600,
                                    }}
                                >
                                    Keep
                                </span>
                            </Button>
                            <Button
                                className="w-1/2 h-auto bg-gradient-to-r from-red-100 to-fuchsia-100 text-black border-none hover:from-red-200 hover:to-fuchsia-200 shadow-md transition-all active:scale-[0.98] whitespace-normal text-center flex items-center justify-center"
                                style={{
                                    padding: `${8 * scaleFactor}px`,
                                    gap: `${8 * scaleFactor}px`,
                                }}
                                onClick={handleTrainNext}
                            >
                                <Move
                                    className="shrink-0"
                                    style={{
                                        width: `${16 * scaleFactor}px`,
                                        height: `${16 * scaleFactor}px`,
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: `${12 * scaleFactor}px`,
                                        fontWeight: 600,
                                    }}
                                >
                                    Adjust
                                </span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KMeansStepHUD;
