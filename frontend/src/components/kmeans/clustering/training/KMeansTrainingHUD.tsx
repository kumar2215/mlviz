import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useKMeans } from "@/contexts/models/KMeansContext";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { Play, Plus, RotateCcw, Target } from "lucide-react";
import React from "react";

interface KMeansTrainingHUDProps {
    onTrain: () => Promise<void>;
    onClear: () => void;
    onReset: () => void;
}

const KMeansTrainingHUD: React.FC<KMeansTrainingHUDProps> = ({ 
    onTrain, 
    onClear, 
    onReset 
}) => {
    const scaleFactor = useScaleFactor();
    const {
        selectedCentroids,
        isPlacingCentroids,
        isLoading,
    } = useKMeans();

    return (
        <div
            className="bg-gradient-to-br from-blue-50 to-purple-50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200"
            style={{
                padding: `${20 * scaleFactor}px`,
                width: `${288 * scaleFactor}px`,
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
                K-Means Training
            </h3>

            <div style={{ gap: `${16 * scaleFactor}px` }} className="flex flex-col">
                {isPlacingCentroids ? (
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
                            className="text-slate-500 italic leading-relaxed"
                            style={{ fontSize: `${12 * scaleFactor}px` }}
                        >
                            Click on data points to select initial cluster centers.
                        </p>

                        <div style={{ gap: `${8 * scaleFactor}px` }} className="flex flex-col">
                            <Button
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all active:scale-[0.98]"
                                style={{
                                    gap: `${8 * scaleFactor}px`,
                                    height: `${40 * scaleFactor}px`,
                                    fontSize: `${14 * scaleFactor}px`,
                                }}
                                onClick={onTrain}
                                disabled={selectedCentroids.length === 0 || isLoading}
                            >
                                <Play
                                    style={{
                                        width: `${16 * scaleFactor}px`,
                                        height: `${16 * scaleFactor}px`,
                                    }}
                                />{" "}
                                {isLoading ? "Training..." : `Train (${selectedCentroids.length} Clusters)`}
                            </Button>
                            
                            <Button
                                variant="ghost"
                                className="w-full text-slate-400 hover:text-slate-600"
                                style={{
                                    fontSize: `${12 * scaleFactor}px`,
                                    height: `${32 * scaleFactor}px`,
                                }}
                                onClick={onClear}
                                disabled={selectedCentroids.length === 0 || isLoading}
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
                    </div>
                ) : (
                    <div style={{ gap: `${12 * scaleFactor}px` }} className="flex flex-col">
                        <p
                            className="text-slate-500 leading-relaxed"
                            style={{ fontSize: `${14 * scaleFactor}px` }}
                        >
                            Model trained successfully. Look at how the training happens by pressing the{" "}
                            <Play
                                className="inline-block text-primary"
                                style={{
                                    width: `${14 * scaleFactor}px`,
                                    height: `${14 * scaleFactor}px`,
                                    verticalAlign: "middle",
                                    marginTop: "-2px",
                                }}
                            />{" "}
                            button.
                        </p>
                        

                        
                        <Button
                            className="w-full bg-gradient-to-r from-blue-100 to-purple-100 text-black border-none hover:from-blue-200 hover:to-purple-200 shadow-md transition-all active:scale-[0.98]"
                            style={{
                                gap: `${8 * scaleFactor}px`,
                                height: `${40 * scaleFactor}px`,
                                fontSize: `${14 * scaleFactor}px`,
                            }}
                            onClick={onReset}
                        >
                            <Plus
                                style={{
                                    width: `${16 * scaleFactor}px`,
                                    height: `${16 * scaleFactor}px`,
                                }}
                            />{" "}
                            Place New Centroids
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KMeansTrainingHUD;
