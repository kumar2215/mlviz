// Main container for visualization controls that composes different control types

import React from "react";
import type { VisualisationControlsProps } from "../types";
import ExportControls from "./ExportControls";
import PlayControls from "./PlayControls";
import ZoomControls from "./ZoomControls";

const VisualisationControls: React.FC<VisualisationControlsProps> = ({
    capabilities,
    playControls,
    zoomControls,
    containerRef,
    svgRef,
    position = "top-left",
    style = "overlay",
    className = "",
}) => {
    const hasPlayControls = capabilities.playable && playControls;
    const hasZoomControls = capabilities.zoomable && zoomControls;
    const hasExportControls =
        capabilities.exportable?.enabled !== false && containerRef;
    const hasAnyControls =
        hasPlayControls || hasZoomControls || hasExportControls;

    if (!hasAnyControls) {
        return null;
    }

    // Position classes
    const positionClasses = {
        "top-right": "absolute top-4 right-4",
        "top-left": "absolute top-4 left-4",
        "bottom-right": "absolute bottom-4 right-4",
        "bottom-left": "absolute bottom-4 left-4",
    };

    const styleClasses = {
        overlay:
            "z-10 bg-gradient-to-br from-blue-50 to-blue-50 backdrop-blur-sm border border-gray-200/50 rounded-lg px-2 py-1 shadow-sm",
        panel: "z-10 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-md",
        toolbar: "z-10 bg-gray-100 border-b border-gray-300 px-3 py-2",
        button: "w-8 h-8 rounded-full text-white border-none cursor-pointer flex items-center justify-center transition-all duration-200 ease-in-out !bg-gradient-to-r !from-slate-500 !to-gray-500 hover:!from-slate-700 !to-gray-700 !hover:drop-shadow-xl",
    };

    const containerClasses = `
        ${positionClasses[position]} 
        ${styleClasses[style]}
        flex items-center gap-3
        ${className}
    `.trim();

    return (
        <div className={containerClasses}>
            {hasPlayControls && (
                <PlayControls
                    playControls={playControls!}
                    showSlider={capabilities.playable?.showSlider !== false}
                    compact={true}
                    buttonStyle={styleClasses.button}
                />
            )}

            {/* Separator between play and zoom controls */}
            {hasPlayControls && hasZoomControls && (
                <div className="w-px h-4 bg-gray-300" />
            )}

            {/* Zoom Controls */}
            {hasZoomControls && (
                <ZoomControls
                    zoomControls={zoomControls!}
                    showResetButton={
                        capabilities.zoomable?.enableReset !== false
                    }
                    compact={true}
                    buttonStyle={styleClasses.button}
                />
            )}

            {/* Separator before export controls */}
            {(hasPlayControls || hasZoomControls) && hasExportControls && (
                <div className="w-px h-4 bg-gray-300" />
            )}

            {hasExportControls && (
                <ExportControls
                    svgRef={svgRef}
                    playControls={playControls}
                    filename={capabilities.exportable?.filename}
                    buttonStyle={styleClasses.button}
                />
            )}
        </div>
    );
};

export default VisualisationControls;
