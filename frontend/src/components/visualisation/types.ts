// Core types for the standardized visualization framework

import * as d3 from "d3";
import React from "react";

interface VisualisationPlayParameters {
    maxSteps: number;
    autoPlay?: boolean;
    stepDuration?: number;
    showSlider?: boolean;
    interpolationSteps?: number;
}

interface VisualisationZoomParameters {
    scaleExtent?: [number, number];
    enableReset?: boolean;
    enablePan?: boolean;
    contentBounds?: {
        width: number;
        height: number;
        margin?: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
    };
    panMargin?: number; // Fixed pixel margin around content bounds
    clickableSelector?: string;
}

interface VisualisationExportParameters {
    formats: ("png" | "jpg" | "gif" | "webm")[];
    filename?: string;
    enabled?: boolean;
}

export interface VisualisationCapabilities {
    playable?: VisualisationPlayParameters;
    zoomable?: VisualisationZoomParameters;
    exportable?: VisualisationExportParameters;
    customizable?: {
        themes: string[];
        colorSchemes: string[];
    };
}

export interface PlayControlState {
    isPlaying: boolean;
    currentStep: number;
    maxSteps: number;
    startPlaying: () => void;
    stopPlaying: () => void;
    resetToStart: () => void;
    setCurrentStep: (step: number) => void;
}

export interface ZoomControlState {
    destroy: () => void;
    zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null;
    svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
    resetZoom: () => void;
    getCurrentTransform: () => d3.ZoomTransform | null;
}

export interface VisualisationControlsProps {
    capabilities: VisualisationCapabilities;
    playControls?: PlayControlState;
    zoomControls?: ZoomControlState;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    svgRef?: React.RefObject<SVGSVGElement | null>;
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    style?: "overlay" | "panel" | "toolbar";
    className?: string;
}

export interface VisualisationDataConfig {
    data: any;
    renderContent: (
        container: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: any,
        context: VisualisationRenderContext
    ) => void;
}

interface VisualizationStyleConfig {
    dimensions?: { width?: number; height?: number };
    theme?: "light" | "dark" | "auto";
    className?: string;
}

interface VisualizationControlsConfig {
    controlsPosition?:
        | "top-right"
        | "top-left"
        | "bottom-right"
        | "bottom-left";
    controlsStyle?: "overlay" | "panel" | "toolbar";
}

interface VisualizationLayoutConfig {
    topControls?: React.ReactNode;
    bottomInfo?: React.ReactNode;
}

interface VisualizationEventHandlers {
    onStepChange?: (step: number) => void;
    onZoomChange?: (transform: d3.ZoomTransform) => void;
}

export interface BaseVisualisationProps {
    // Core configuration
    dataConfig: VisualisationDataConfig;
    capabilities: VisualisationCapabilities;

    // Optional configurations
    styleConfig?: VisualizationStyleConfig;
    controlsConfig?: VisualizationControlsConfig;
    layoutConfig?: VisualizationLayoutConfig;
    eventHandlers?: VisualizationEventHandlers;
}

interface VisualisationRenderDimensions {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    scaleFactor: number;
}

interface VisualisationRenderStyling {
    theme: "light" | "dark";
    colorScale?: d3.ScaleOrdinal<string, string>;
}

interface VisualisationRenderState {
    currentStep?: number;
    maxSteps?: number;
    isPlaying?: boolean;
    zoomTransform?: d3.ZoomTransform | null;
    // Interpolation support for smooth animations
    interpolation?: {
        currentStepFloor: number;
        stepFraction: number;
    };
    // SVG element for attaching behaviors at the root level
    svgSelection?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
}

export interface VisualisationRenderContext {
    state: VisualisationRenderState;
    dimensions: VisualisationRenderDimensions;
    styling: VisualisationRenderStyling;
}

export interface VisualisationColors {
    play: {
        bg: string;
        hover: string;
        active: string;
    };
    pause: {
        bg: string;
        hover: string;
        active: string;
    };
    restart: {
        bg: string;
        hover: string;
        active: string;
    };
    neutral: {
        bg: string;
        hover: string;
        border: string;
    };
}
