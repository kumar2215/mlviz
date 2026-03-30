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
                            Kernel
                        </button>
                    </div>
                </div>
                
                <p className="text-slate-400 leading-tight italic" style={{ fontSize: fs(9) }}>
                    {showKernelSpace 
                        ? "Showing projected kernel space where data is more separable." 
                        : "Showing original 2D feature dimensions."}
                </p>
            </div>
        </CollapsibleHUD>
    );
};

export default SVMVisualisationHUD;
