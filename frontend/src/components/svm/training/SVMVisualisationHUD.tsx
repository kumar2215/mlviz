import CollapsibleHUD from "@/components/visualisation/CollapsibleHUD";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { Layers } from "lucide-react";
import React from "react";

interface SVMVisualisationHUDProps {
    showKernelSpace: boolean;
    setShowKernelSpace: (show: boolean) => void;
}

const SVMVisualisationHUD: React.FC<SVMVisualisationHUDProps> = ({
    showKernelSpace,
    setShowKernelSpace,
}) => {
    const scaleFactor = useScaleFactor();
    const fs = (n: number) => `${n * scaleFactor}px`;

    return (
        <CollapsibleHUD
            icon={<Layers style={{ width: fs(14), height: fs(14) }} className="text-indigo-500" />}
            title="Visualisation"
            style={{ width: fs(200) }}
        >
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                    <span className="text-slate-500 font-medium" style={{ fontSize: fs(11) }}>
                        Feature Space
                    </span>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setShowKernelSpace(false)}
                            className={`flex-1 py-1 px-2 rounded-md transition-all font-medium ${
                                !showKernelSpace 
                                ? "bg-white text-indigo-600 shadow-sm" 
                                : "text-slate-600 hover:text-slate-800"
                            }`}
                            style={{ fontSize: fs(10) }}
                        >
                            Original
                        </button>
                        <button
                            onClick={() => setShowKernelSpace(true)}
                            className={`flex-1 py-1 px-2 rounded-md transition-all font-medium ${
                                showKernelSpace 
                                ? "bg-white text-indigo-600 shadow-sm" 
                                : "text-slate-600 hover:text-slate-800"
                            }`}
                            style={{ fontSize: fs(10) }}
                        >
                            Projected
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <p className="text-slate-400 leading-tight italic" style={{ fontSize: fs(9) }}>
                        {showKernelSpace 
                            ? "Data is 'unfolded' into the feature space where it becomes linearly separable." 
                            : "Showing original 2D feature dimensions."}
                    </p>

                    {showKernelSpace && (
                        <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-100 pt-2">
                            <div className="flex flex-col">
                                <span className="text-indigo-600 font-semibold" style={{ fontSize: fs(8.5) }}>X: Decision Score f(x)</span>
                                <span className="text-slate-500 leading-tight" style={{ fontSize: fs(8.5) }}>
                                    Distance from the hyperplane. Boundary is at 0, margins at ±1.
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-indigo-600 font-semibold" style={{ fontSize: fs(8.5) }}>Y: Variance Spread</span>
                                <span className="text-slate-500 leading-tight" style={{ fontSize: fs(8.5) }}>
                                    Preserves the most remaining data variance for visual clarity.
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleHUD>
    );
};

export default SVMVisualisationHUD;
