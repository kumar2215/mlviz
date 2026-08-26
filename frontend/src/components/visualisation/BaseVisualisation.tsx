import * as d3 from "d3";
import React, { useRef } from "react";
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

    const lastRendererRef = useRef<any>(null);
    const contentGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
    const normalizationRef = useRef<{ x: number; y: number } | null>(null);

    React.useLayoutEffect(() => {
        if (!data || !svgRef.current || !containerRef.current) return;

        const svg = d3.select(svgRef.current);
        
        // Ensure stable content group structure to prevent coordinate flicker
        let contentGroup = svg.select<SVGGElement>("g.content-container");
        if (contentGroup.empty()) {
            contentGroup = svg.append("g")
                .attr("class", "content-container")
                .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);
        }
        contentGroupRef.current = contentGroup;

        let currentZoomTransform =
            capabilities.zoomable && zoomControls
                ? zoomControls.getCurrentTransform?.() || d3.zoomIdentity
                : d3.zoomIdentity;

        // If the renderer or data has changed fundamentally, we might want a clear,
        // but for ongoing updates (like tree expansion), we let the renderer's .join() handle it.
        // We only clear if this is a first-time render or the render function itself changed.
        if (lastRendererRef.current !== renderContent) {
            contentGroup.selectAll("*").remove();
            lastRendererRef.current = renderContent;
            normalizationRef.current = null;
        }

        const containerWidth =
            containerRef.current.clientWidth || dimensions?.width || 800;
        const containerHeight =
            containerRef.current.clientHeight || dimensions?.height || 600;

        svg.attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`);

        // Calculate inner dimensions
        const innerWidth = containerWidth - MARGIN.left - MARGIN.right;
        const innerHeight = containerHeight - MARGIN.top - MARGIN.bottom;

        if (capabilities.zoomable && zoomControls) {
            const extendedZoomControls = zoomControls as any;

            // Update content bounds with actual inner dimensions
            if (extendedZoomControls.updateContentBounds) {
                const initialBounds = capabilities.zoomable?.contentBounds;
                let boundsToSet = {
                    width: innerWidth,
                    height: innerHeight,
                    margin: MARGIN,
                };
                
                if (initialBounds) {
                    const heightScale = innerHeight / (initialBounds.height || 600);
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
        }

        const currentStep = playControls?.currentStep || 0;
        const stepFloor = Math.floor(currentStep);
        const stepFraction = currentStep - stepFloor;

        const renderContext: VisualisationRenderContext = {
            state: {
                currentStep,
                maxSteps: playControls?.maxSteps || 0,
                isPlaying: playControls?.isPlaying || false,
                zoomTransform: currentZoomTransform,
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

        // Render the content into the persistent group
        renderContent(contentGroup, data, renderContext);
        
        // Apply fit-to-view transform or shift-compensation if calculated by renderer
        if (capabilities.zoomable && zoomControls && (renderContext as any).fitToViewTransform) {
            const extendedZoomControls = zoomControls as any;
            const fitTransform = (renderContext as any).fitToViewTransform;

            if (fitTransform.contentWidth && fitTransform.contentHeight && extendedZoomControls.updateContentBounds) {
                extendedZoomControls.updateContentBounds({
                    width: fitTransform.contentWidth,
                    height: fitTransform.contentHeight,
                });
            }

            const centeredTransform = d3.zoomIdentity
                .translate(fitTransform.x, fitTransform.y)
                .scale(fitTransform.k);

            const isInitialLoad = !normalizationRef.current;
            
            if (isInitialLoad) {
                // Initial load: centers the tree.
                extendedZoomControls.setZoom(centeredTransform, false);
                normalizationRef.current = { 
                    x: fitTransform.normalizationShiftX, 
                    y: fitTransform.normalizationShiftY 
                };
            } else {
                // Ongoing update (expansion): compensate for normalization shift.
                // The renderer normalized by (shiftX, shiftY). If shiftX changed, 
                // all existing nodes shifted by -(newShiftX - oldShiftX) in layout space.
                // We must shift the zoom transform by (newShiftX - oldShiftX) * scale to compensate.
                const deltaX = (fitTransform.normalizationShiftX - normalizationRef.current!.x) * currentZoomTransform.k;
                const deltaY = (fitTransform.normalizationShiftY - normalizationRef.current!.y) * currentZoomTransform.k;
                
                const compensatedTransform = currentZoomTransform.translate(-deltaX / currentZoomTransform.k, -deltaY / currentZoomTransform.k);
                
                extendedZoomControls.setZoom(compensatedTransform, false);
                normalizationRef.current = { 
                    x: fitTransform.normalizationShiftX, 
                    y: fitTransform.normalizationShiftY 
                };
            }
            
            extendedZoomControls.setResetTransform?.(centeredTransform);
        }
    }, [
        data,
        renderContent,
        capabilities,
        dimensions,
        theme,
        playControls?.currentStep,
        playControls?.isPlaying,
        zoomControls,
    ]);

    // Cleanup effect for HMR and unmount
    React.useLayoutEffect(() => {
        return () => {
            const group = contentGroupRef.current;
            if (group) {
                group.selectAll("*").remove();
            }
            
            // Clean up D3 zoom behavior for HMR
            if (zoomControls?.destroy) {
                zoomControls.destroy();
            }
        };
    }, [zoomControls]);

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
