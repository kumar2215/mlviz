import { fontUrlMapping } from "@/components/visualisation/config/fonts";
import type { PlayControlState } from "@/components/visualisation/types";
import * as opentype from "opentype.js";
import { useCallback, useState } from "react";

export type ExportFormat = "png" | "svg" | "webm";
export type ExportStatus =
    | "idle"
    | "capturing"
    | "processing"
    | "complete"
    | "error";

export interface UseExportProps {
    svgRef?: React.RefObject<SVGSVGElement | null>;
    playControls?: PlayControlState;
    filename?: string;
    videoResolution?: {
        width: number;
        height: number;
    };
}

export interface UseExportReturn {
    exportStatus: ExportStatus;
    exportProgress: number;
    exportAsImage: (format: "png") => Promise<void>;
    exportAsSVG: () => Promise<void>;
    exportAsVideo: (format: "webm") => Promise<void>;
    resetExportStatus: () => void;
}
export const useExport = ({
    svgRef,
    playControls,
    filename = "visualization",
    videoResolution = { width: 1920, height: 1080 }, // Default to 1080p
}: UseExportProps): UseExportReturn => {
    const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
    const [exportProgress, setExportProgress] = useState<number>(0);

    const resetExportStatus = useCallback(() => {
        setExportStatus("idle");
        setExportProgress(0);
    }, []);

    const convertTextToPaths = useCallback(
        async (svgElement: SVGSVGElement): Promise<void> => {
            const textElements = svgElement.querySelectorAll("text");

            const fontCache = new Map<string, opentype.Font>();

            const loadFont = async (
                fontFamily: string
            ): Promise<opentype.Font | null> => {
                if (fontCache.has(fontFamily)) {
                    return fontCache.get(fontFamily)!;
                }

                try {
                    const firstFont = fontFamily
                        .split(",")[0]
                        .trim()
                        .replace(/['"]/g, "");
                    let fontUrl =
                        fontUrlMapping[
                            firstFont as keyof typeof fontUrlMapping
                        ];

                    if (!fontUrl) {
                        // Try to match against any font in the stack
                        const fontStack = fontFamily
                            .split(",")
                            .map((f) => f.trim().replace(/['"]/g, ""));
                        for (const font of fontStack) {
                            fontUrl =
                                fontUrlMapping[
                                    font as keyof typeof fontUrlMapping
                                ];
                            if (fontUrl) break;
                        }
                    }

                    if (!fontUrl) {
                        // Use Inter as fallback
                        fontUrl = fontUrlMapping["Inter"];
                    }

                    const font = await opentype.load(fontUrl);
                    fontCache.set(fontFamily, font);
                    return font;
                } catch (error) {
                    console.warn(`Failed to load font ${fontFamily}:`, error);
                    return null;
                }
            };

            for (const textEl of Array.from(textElements)) {
                try {
                    const computedStyle = window.getComputedStyle(textEl);
                    const text = textEl.textContent || "";
                    if (!text.trim()) continue;

                    // Get text properties
                    const fontSize = parseFloat(computedStyle.fontSize) || 12;
                    const fontFamily = computedStyle.fontFamily || "Arial";
                    const fill =
                        computedStyle.fill ||
                        textEl.getAttribute("fill") ||
                        "black";

                    // Get position attributes
                    const x = parseFloat(textEl.getAttribute("x") || "0");
                    const y = parseFloat(textEl.getAttribute("y") || "0");
                    const textAnchor =
                        textEl.getAttribute("text-anchor") || "start";
                    const dominantBaseline =
                        textEl.getAttribute("dominant-baseline") ||
                        "alphabetic";
                    const transform = textEl.getAttribute("transform") || "";

                    // Load the font
                    const font = await loadFont(fontFamily);

                    if (!font) {
                        console.warn(
                            `Font ${fontFamily} not available, skipping text element:`,
                            text
                        );
                        continue;
                    }

                    // Create text path using opentype.js
                    const fontSizePx = fontSize;
                    const textPath = font.getPath(text, x, y, fontSizePx);

                    // Get the actual path data
                    let pathData = textPath.toPathData(5);

                    // Adjust positioning based on text-anchor
                    if (textAnchor !== "start") {
                        const textMetrics = font.getAdvanceWidth(
                            text,
                            fontSizePx
                        );
                        let offsetX = 0;

                        if (textAnchor === "middle") {
                            offsetX = -textMetrics / 2;
                        } else if (textAnchor === "end") {
                            offsetX = -textMetrics;
                        }

                        if (offsetX !== 0) {
                            // Apply offset to path by creating a transform
                            pathData = `M ${offsetX} 0 ${pathData.substring(
                                1
                            )}`;
                        }
                    }

                    // Adjust for dominant-baseline
                    let baselineOffset = 0;
                    const ascender =
                        (font.ascender / font.unitsPerEm) * fontSizePx;
                    const descender =
                        (font.descender / font.unitsPerEm) * fontSizePx;

                    if (dominantBaseline === "middle") {
                        baselineOffset = (ascender + descender) / 2;
                    } else if (dominantBaseline === "hanging") {
                        baselineOffset = ascender;
                    }

                    // Create path element
                    const pathElement = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "path"
                    );
                    pathElement.setAttribute("d", pathData);
                    pathElement.setAttribute("fill", fill);
                    pathElement.setAttribute("stroke", "none");

                    // Apply transforms including baseline adjustment
                    let finalTransform = "";
                    if (baselineOffset !== 0) {
                        finalTransform += `translate(0, ${baselineOffset})`;
                    }
                    if (transform) {
                        finalTransform += ` ${transform}`;
                    }
                    if (finalTransform) {
                        pathElement.setAttribute(
                            "transform",
                            finalTransform.trim()
                        );
                    }

                    // Add data attributes for debugging
                    pathElement.setAttribute("data-original-text", text);
                    pathElement.setAttribute(
                        "data-converted-from-text",
                        "true"
                    );
                    pathElement.setAttribute("data-font-family", fontFamily);

                    // Replace text element with path element
                    textEl.parentNode?.replaceChild(pathElement, textEl);
                } catch (error) {
                    console.warn(
                        "Failed to convert text element to path:",
                        error,
                        textEl
                    );
                }
            }
        },
        []
    );

    const convertSvgToPng = useCallback(
        async (
            svgElement: SVGSVGElement,
            scale: number = 2
        ): Promise<HTMLCanvasElement> => {
            return new Promise((resolve, reject) => {
                try {
                    // Clone and prepare the SVG
                    const svgClone = svgElement.cloneNode(
                        true
                    ) as SVGSVGElement;

                    // Ensure proper SVG attributes
                    svgClone.setAttribute(
                        "xmlns",
                        "http://www.w3.org/2000/svg"
                    );
                    svgClone.setAttribute(
                        "xmlns:xlink",
                        "http://www.w3.org/1999/xlink"
                    );

                    // Get dimensions
                    const width =
                        svgElement.clientWidth ||
                        parseInt(svgClone.getAttribute("width") || "800");
                    const height =
                        svgElement.clientHeight ||
                        parseInt(svgClone.getAttribute("height") || "600");

                    // Set explicit dimensions
                    svgClone.setAttribute("width", width.toString());
                    svgClone.setAttribute("height", height.toString());

                    // Preserve viewBox if it exists
                    if (svgElement.viewBox.baseVal) {
                        const viewBox = svgElement.viewBox.baseVal;
                        svgClone.setAttribute(
                            "viewBox",
                            `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
                        );
                    }

                    // Convert text to paths for perfect font rendering
                    convertTextToPaths(svgClone)
                        .then(() => {
                            // Serialize the SVG
                            const serializer = new XMLSerializer();
                            const svgString =
                                serializer.serializeToString(svgClone);

                            // Create data URL
                            const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                                svgString
                            )}`;

                            // Load SVG as image
                            const img = new Image();
                            img.onload = () => {
                                // Create high-DPI canvas
                                const canvas = document.createElement("canvas");
                                canvas.width = width * scale;
                                canvas.height = height * scale;

                                const ctx = canvas.getContext("2d");
                                if (!ctx) {
                                    reject(
                                        new Error(
                                            "Failed to get canvas context"
                                        )
                                    );
                                    return;
                                }

                                // Set high-quality rendering
                                ctx.imageSmoothingEnabled = true;
                                ctx.imageSmoothingQuality = "high";

                                // Fill with white background
                                ctx.fillStyle = "#ffffff";
                                ctx.fillRect(0, 0, canvas.width, canvas.height);

                                // Draw SVG image to canvas
                                ctx.drawImage(
                                    img,
                                    0,
                                    0,
                                    canvas.width,
                                    canvas.height
                                );

                                resolve(canvas);
                            };

                            img.onerror = (error) => {
                                reject(
                                    new Error(
                                        `Failed to load SVG as image: ${error}`
                                    )
                                );
                            };

                            img.src = svgDataUrl;
                        })
                        .catch(reject);
                } catch (error) {
                    reject(
                        new Error(
                            `SVG to PNG conversion failed: ${
                                error instanceof Error
                                    ? error.message
                                    : "Unknown error"
                            }`
                        )
                    );
                }
            });
        },
        [convertTextToPaths]
    );

    const downloadCanvas = useCallback(
        (canvas: HTMLCanvasElement, name: string, format: string): void => {
            const link = document.createElement("a");
            link.download = `${name}.${format}`;
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            });
        },
        []
    );

    const exportAsSVG = useCallback(async (): Promise<void> => {
        if (!svgRef?.current) {
            throw new Error("SVG reference not available");
        }

        try {
            setExportStatus("processing");
            setExportProgress(25);

            // Clone the SVG element to avoid modifying the original
            const svgElement = svgRef.current;
            const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

            setExportProgress(50);

            // Ensure proper SVG attributes
            svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            svgClone.setAttribute(
                "xmlns:xlink",
                "http://www.w3.org/1999/xlink"
            );

            // Preserve current dimensions and viewBox
            if (svgElement.viewBox.baseVal) {
                const viewBox = svgElement.viewBox.baseVal;
                svgClone.setAttribute(
                    "viewBox",
                    `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
                );
            }

            // Ensure width and height are set
            if (svgElement.clientWidth && svgElement.clientHeight) {
                svgClone.setAttribute(
                    "width",
                    svgElement.clientWidth.toString()
                );
                svgClone.setAttribute(
                    "height",
                    svgElement.clientHeight.toString()
                );
            }

            setExportProgress(60);

            // Convert text elements to vector paths using opentype.js
            await convertTextToPaths(svgClone);

            setExportProgress(75);

            // Serialize the SVG to string
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgClone);

            // Create proper SVG document with XML declaration
            const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;

            setExportProgress(90);

            // Create and download the file
            const blob = new Blob([svgContent], {
                type: "image/svg+xml;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${filename}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setExportProgress(100);
            setExportStatus("complete");
            setTimeout(resetExportStatus, 2000);
        } catch (error) {
            console.error("SVG export failed:", error);
            setExportStatus("error");
            setTimeout(resetExportStatus, 5000);
        }
    }, [svgRef, filename, resetExportStatus, convertTextToPaths]);

    const exportAsImage = useCallback(
        async (format: "png"): Promise<void> => {
            if (!svgRef?.current) {
                throw new Error("SVG reference not available");
            }
            try {
                setExportStatus("capturing");
                setExportProgress(25);

                // Convert SVG to PNG using the new SVG-first approach
                const canvas = await convertSvgToPng(svgRef.current, 2);

                setExportProgress(70);
                setExportProgress(90);
                downloadCanvas(canvas, filename, format);
                setExportProgress(100);
                setExportStatus("complete");
                setTimeout(resetExportStatus, 2000);
            } catch (error) {
                console.error("SVG-first PNG export failed:", error);
                setExportStatus("error");
                setTimeout(resetExportStatus, 5000);
            }
        },
        [svgRef, filename, convertSvgToPng, downloadCanvas, resetExportStatus]
    );

    const exportAsVideo = useCallback(
        async (_format: "webm"): Promise<void> => {
            if (!svgRef?.current || !playControls) {
                throw new Error(
                    "SVG reference and play controls are required for video export"
                );
            }

            try {
                setExportStatus("capturing");
                setExportProgress(0);

                // Store original play state
                const originalIsPlaying = playControls.isPlaying;
                const originalStep = playControls.currentStep;

                // Stop playback during export
                if (originalIsPlaying) {
                    playControls.stopPlaying();
                }

                const fps = 12;
                const frameDuration = 1000 / fps;
                const stepDuration = 800;
                const framesPerStep = Math.ceil(stepDuration / frameDuration);
                const totalSteps = playControls.maxSteps + 1;
                const totalFrames = totalSteps * framesPerStep;

                // Create canvas for video capture with proper aspect ratio
                const canvas = document.createElement("canvas");
                const svgElement = svgRef.current;

                const svgWidth = svgElement.clientWidth || 800;
                const svgHeight = svgElement.clientHeight || 600;
                const svgAspectRatio = svgWidth / svgHeight;
                const targetAspectRatio =
                    videoResolution.width / videoResolution.height;

                if (svgAspectRatio > targetAspectRatio) {
                    canvas.width = videoResolution.width;
                    canvas.height = Math.round(
                        videoResolution.width / svgAspectRatio
                    );
                } else {
                    // SVG is taller - fit to height
                    canvas.height = videoResolution.height;
                    canvas.width = Math.round(
                        videoResolution.height * svgAspectRatio
                    );
                }

                const stream = canvas.captureStream(fps);
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: "video/webm;codecs=vp9",
                });

                const chunks: Blob[] = [];
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    setExportStatus("processing");
                    setExportProgress(90);

                    const blob = new Blob(chunks, { type: "video/webm" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${filename}.webm`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    setExportProgress(100);
                    setExportStatus("complete");
                    setTimeout(resetExportStatus, 2000);

                    // Restore original play state
                    playControls.setCurrentStep(originalStep);
                    if (originalIsPlaying) {
                        playControls.startPlaying();
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error("MediaRecorder error:", error);
                    setExportStatus("error");
                    setTimeout(resetExportStatus, 5000);
                };

                // Start recording
                mediaRecorder.start();

                // Generate frames by stepping through animation
                let currentFrame = 0;

                const captureFrame = async () => {
                    if (currentFrame >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Calculate which step and interpolation we're at
                    const stepIndex = Math.floor(currentFrame / framesPerStep);
                    const frameInStep = currentFrame % framesPerStep;
                    const stepProgress = frameInStep / framesPerStep;

                    // Set the current step with interpolation
                    const interpolatedStep = stepIndex + stepProgress;
                    playControls.setCurrentStep(
                        Math.min(interpolatedStep, playControls.maxSteps)
                    );

                    // Wait a bit for the visualization to update
                    await new Promise((resolve) => setTimeout(resolve, 50));

                    try {
                        // Convert current SVG state to canvas at original size
                        const frameCanvas = await convertSvgToPng(
                            svgRef.current!,
                            1
                        );

                        // Draw frame to recording canvas with proper scaling and centering
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.fillStyle = "#ffffff";
                            ctx.fillRect(0, 0, canvas.width, canvas.height);

                            // Calculate scaling and centering to maintain aspect ratio
                            const scaleX = canvas.width / frameCanvas.width;
                            const scaleY = canvas.height / frameCanvas.height;
                            const scale = Math.min(scaleX, scaleY);

                            const scaledWidth = frameCanvas.width * scale;
                            const scaledHeight = frameCanvas.height * scale;
                            const x = (canvas.width - scaledWidth) / 2;
                            const y = (canvas.height - scaledHeight) / 2;

                            ctx.drawImage(
                                frameCanvas,
                                x,
                                y,
                                scaledWidth,
                                scaledHeight
                            );
                        }
                    } catch (error) {
                        console.warn(
                            `Failed to capture frame ${currentFrame}:`,
                            error
                        );
                    }

                    currentFrame++;
                    setExportProgress(
                        Math.floor((currentFrame / totalFrames) * 85)
                    ); // Reserve 15% for processing

                    // Schedule next frame
                    setTimeout(captureFrame, frameDuration);
                };

                // Start frame capture
                await captureFrame();
            } catch (error) {
                console.error("WebM export failed:", error);
                setExportStatus("error");
                setTimeout(resetExportStatus, 5000);

                // Restore original state on error
                if (playControls) {
                    playControls.setCurrentStep(playControls.currentStep);
                }
            }
        },
        [
            svgRef,
            playControls,
            filename,
            videoResolution,
            convertSvgToPng,
            resetExportStatus,
        ]
    );

    return {
        exportStatus,
        exportProgress,
        exportAsImage,
        exportAsSVG,
        exportAsVideo,
        resetExportStatus,
    };
};
