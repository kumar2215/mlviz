import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { useScaleFactor } from "../../hooks/useScaleFactor";
import VisualisationControls from "./controls/VisualisationControls";
import { usePlayControls } from "./hooks/usePlayControls";
import { useZoomControls } from "./hooks/useZoomControls";
import type {
    BaseVisualisationProps,
    VisualisationRenderContext,
} from "./types";

const MARGIN = { top: 60, right: 30, bottom: 30, left: 30 };

const BaseVisualisation: React.FC<BaseVisualisationProps> = ({
    dataConfig,
    capabilities,
    styleConfig,
    controlsConfig,
    layoutConfig,
    eventHandlers,
}) => {
    const { data, renderContent } = dataConfig;
    const { dimensions, theme = "light", className = "" } = styleConfig || {};
    const { controlsPosition = "top-left", controlsStyle = "overlay" } =
        controlsConfig || {};
    const { topControls, bottomInfo } = layoutConfig || {};
    const { onStepChange, onZoomChange } = eventHandlers || {};
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const visualizationRef = useRef<HTMLDivElement>(null);
    const scaleFactor = useScaleFactor();

    const playControls = capabilities.playable
        ? usePlayControls({
              maxSteps: capabilities.playable.maxSteps,
              stepDuration: capabilities.playable.stepDuration,
              autoPlay: capabilities.playable.autoPlay,
              interpolationSteps: capabilities.playable.interpolationSteps,
              onStepChange,
          })
        : undefined;

    const zoomControls = capabilities.zoomable
        ? useZoomControls({
              scaleExtent: capabilities.zoomable.scaleExtent,
              enablePan: capabilities.zoomable.enablePan,
              contentBounds: capabilities.zoomable.contentBounds,
              panMargin: capabilities.zoomable.panMargin,
              clickableSelector: capabilities.zoomable.clickableSelector,
              onZoomChange,
          })
        : undefined;

    useEffect(() => {
        if (!data || !svgRef.current || !containerRef.current) return;

        const currentZoomTransform =
            capabilities.zoomable && zoomControls
                ? zoomControls.getCurrentTransform?.()
                : null;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const containerWidth =
            containerRef.current.clientWidth || dimensions?.width || 800;
        const containerHeight =
            containerRef.current.clientHeight || dimensions?.height || 600;

        svg.attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`);

        const contentGroup = svg
            .append("g")
            .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

        // Calculate inner dimensions
        const innerWidth = containerWidth - MARGIN.left - MARGIN.right;
        const innerHeight = containerHeight - MARGIN.top - MARGIN.bottom;

        if (capabilities.zoomable && zoomControls) {
            const extendedZoomControls = zoomControls as any;

            // Update content bounds with actual inner dimensions
            // If initial bounds were provided, scale proportionally to preserve aspect ratio
            if (extendedZoomControls.updateContentBounds) {
                const initialBounds = capabilities.zoomable?.contentBounds;
                let boundsToSet = {
                    width: innerWidth,
                    height: innerHeight,
                    margin: MARGIN,
                };
                
                // If initial bounds were configured, scale them proportionally
                if (initialBounds) {
                    const heightScale = innerHeight / (initialBounds.height || 600);
                    // Use the initial bounds' aspect ratio, scaled to fit actual dimensions
                    boundsToSet = {
                        width: innerWidth,
                        height: initialBounds.height * heightScale,
                        margin: MARGIN,
                    };
                }
                
                extendedZoomControls.updateContentBounds(boundsToSet);
            }

            extendedZoomControls.createZoomBehavior(
                svg,
                contentGroup,
                `translate(${MARGIN.left}, ${MARGIN.top})`
            );

            if (
                currentZoomTransform &&
                currentZoomTransform !== d3.zoomIdentity
            ) {
                setTimeout(() => {
                    extendedZoomControls.setZoom(currentZoomTransform, false);
                }, 0);
            }
        }

        const currentStep = playControls?.currentStep || 0;
        const stepFloor = Math.floor(currentStep);
        const stepFraction = currentStep - stepFloor;

        const renderContext: VisualisationRenderContext = {
            state: {
                currentStep,
                maxSteps: playControls?.maxSteps || 0,
                isPlaying: playControls?.isPlaying || false,
                zoomTransform: zoomControls?.getCurrentTransform?.(),
                interpolation: {
                    currentStepFloor: stepFloor,
                    stepFraction: stepFraction,
                },
                svgSelection: svg,
            },
            dimensions: {
                width: containerWidth,
                height: containerHeight,
                margin: MARGIN,
                scaleFactor: scaleFactor,
            },
            styling: {
                theme: theme === "auto" ? "light" : theme,
                colorScale: d3.scaleOrdinal(d3.schemeCategory10),
            },
        };

        renderContent(contentGroup, data, renderContext);
        
        // Apply fit-to-view transform if calculated by renderer
        if (capabilities.zoomable && zoomControls && (renderContext as any).fitToViewTransform) {
            const extendedZoomControls = zoomControls as any;
            const fitTransform = (renderContext as any).fitToViewTransform;
            
            // Update content bounds with actual tree dimensions if provided
            if (fitTransform.contentWidth && fitTransform.contentHeight && extendedZoomControls.updateContentBounds) {
                extendedZoomControls.updateContentBounds({
                    width: fitTransform.contentWidth,
                    height: fitTransform.contentHeight,
                });
            }
            
            // Don't apply fit-to-view transform - let tree start at identity position (0,0,1)
            // This matches the position when reset zoom is clicked
        }
    // Note: zoomControls is intentionally excluded — useZoomControls returns a new
    // object reference every render, which would cause an infinite re-render loop.
    // Its functions are stable (useCallback with refs) so this is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        data,
        renderContent,
        capabilities,
        dimensions,
        theme,
        playControls?.currentStep,
        playControls?.isPlaying,
    ]);

    return (
        <div
            className={`w-full h-full min-h-0 shadow-lg overflow-hidden flex flex-col ${className}`}
        >
            {/* Top Controls Slot */}
            {topControls && (
                <div className="bg-white p-4 flex-shrink-0">{topControls}</div>
            )}

            <div
                ref={visualizationRef}
                className="flex-1 overflow-hidden bg-gradient-to-br from-gray-50 to-white min-h-0 relative"
            >
                <VisualisationControls
                    capabilities={{
                        ...capabilities,
                        exportable: capabilities.exportable || {
                            formats: capabilities.playable
                                ? ["png", "jpg", "gif", "webm"]
                                : ["png", "jpg"],
                            enabled: true,
                        },
                    }}
                    playControls={playControls}
                    zoomControls={zoomControls}
                    containerRef={visualizationRef}
                    svgRef={svgRef}
                    position={controlsPosition}
                    style={controlsStyle}
                />

                {/* SVG Container */}
                <div
                    ref={containerRef}
                    className="w-full h-full"
                >
                    <svg
                        ref={svgRef}
                        className="block w-full h-full"
                    />
                </div>
            </div>

            {/* Bottom Info Slot */}
            {bottomInfo && (
                <div className="p-2 border-t bg-gray-50 text-xs text-gray-600 flex-shrink-0">
                    {bottomInfo}
                </div>
            )}
        </div>
    );
};

export default BaseVisualisation;
