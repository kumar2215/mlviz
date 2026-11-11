import {
    AlertCircle,
    Check,
    Download,
    Image,
    Loader,
    Video,
} from "lucide-react";
import React, { useState } from "react";
import {
    useExport,
    type ExportFormat,
    type ExportStatus,
} from "../hooks/useExport";
import type { PlayControlState } from "../types";

interface ExportControlsProps {
    svgRef?: React.RefObject<SVGSVGElement | null>;
    playControls?: PlayControlState;
    filename?: string;
    className?: string;
    buttonStyle: string;
}

const ExportControls: React.FC<ExportControlsProps> = ({
    svgRef,
    playControls,
    filename = "visualization",
    className = "",
    buttonStyle = "",
}) => {
    const [showOptions, setShowOptions] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("png");

    const {
        exportStatus,
        exportProgress,
        exportAsImage,
        exportAsSVG,
        exportAsVideo,
    } = useExport({
        svgRef,
        playControls,
        filename,
    });

    const handleExport = async () => {
        try {
            if (selectedFormat === "png") {
                await exportAsImage(selectedFormat);
            } else if (selectedFormat === "svg") {
                await exportAsSVG();
            } else if (selectedFormat === "webm") {
                await exportAsVideo(selectedFormat);
            }
        } catch (error) {
            console.error("Export failed:", error);
        }
        setShowOptions(false);
    };

    const getStatusIcon = (status: ExportStatus) => {
        switch (status) {
            case "capturing":
            case "processing":
                return <Loader className="w-4 h-4 animate-spin" />;
            case "complete":
                return <Check className="w-4 h-4 text-success-foreground" />;
            case "error":
                return <AlertCircle className="w-4 h-4 text-danger-foreground" />;
            default:
                return <Download className="w-4 h-4" />;
        }
    };

    const getStatusText = (status: ExportStatus) => {
        switch (status) {
            case "capturing":
                return "Capturing...";
            case "processing":
                return "Processing...";
            case "complete":
                return "Downloaded!";
            case "error":
                return "Export Failed";
            default:
                return "Export";
        }
    };

    if (exportStatus === "processing" || exportStatus === "capturing") {
        return (
            <div className={`relative ${className}`}>
                <div className="bg-surface border border-border rounded-lg shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(exportStatus)}
                        <span className="text-sm font-medium">
                            {getStatusText(exportStatus)}
                        </span>
                    </div>
                    <div className="w-full bg-surface-hover rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${exportProgress}%` }}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {exportProgress}%
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setShowOptions(!showOptions)}
                className={`${buttonStyle}`}
                aria-label="Export visualization"
            >
                {getStatusIcon(exportStatus)}
            </button>

            {showOptions && (
                <div className="absolute top-full mt-1 right-0 bg-surface border border-border rounded-lg shadow-lg z-50 min-w-[280px]">
                    <div className="p-4">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-foreground mb-2">
                                Export Format
                            </h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="png"
                                        checked={selectedFormat === "png"}
                                        onChange={(e) =>
                                            setSelectedFormat(
                                                e.target.value as ExportFormat
                                            )
                                        }
                                        className="text-primary"
                                    />
                                    <Image className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">
                                        PNG (High Quality)
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="svg"
                                        checked={selectedFormat === "svg"}
                                        onChange={(e) =>
                                            setSelectedFormat(
                                                e.target.value as ExportFormat
                                            )
                                        }
                                        className="text-primary"
                                    />
                                    <Image className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">
                                        SVG (Vector Graphics)
                                    </span>
                                </label>
                                {playControls && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="format"
                                            value="webm"
                                            checked={selectedFormat === "webm"}
                                            onChange={(e) =>
                                                setSelectedFormat(
                                                    e.target
                                                        .value as ExportFormat
                                                )
                                            }
                                            className="text-primary"
                                        />
                                        <Video className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            WebM (Animation Video)
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-border">
                            <button
                                onClick={handleExport}
                                className="flex-1 !bg-primary !text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-hover transition-colors"
                            >
                                Export {selectedFormat.toUpperCase()}
                            </button>
                            <button
                                onClick={() => setShowOptions(false)}
                                className="px-3 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-surface-subtle transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportControls;
