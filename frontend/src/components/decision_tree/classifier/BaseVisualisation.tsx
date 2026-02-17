import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { TreeNode } from "@/types/model";
import { DEFAULT_COLORS } from "@/utils/colorUtils";
import { useCallback } from "react";

import type { VisualisationRenderContext } from "@/components/visualisation/types";
import type { RenderVisualisationProps } from "./types";

interface BaseDecisionTreeVisualizationProps {
    data: Record<string, any>;
    points?: Record<string, number>;
    transformTreeData: (node: TreeNode, depth?: number) => any;
    getTooltipContent?: (d: any) => string;
    topControls?: React.ReactNode;
    bottomInfo?: React.ReactNode;
    nodeStyleConfig?: {
        pathLineColor?: string;
        pathFillColor?: string;
    };
    currentDepth?: number;
    maxDepth?: number;
    maxDisplayDepth?: number;
    onDepthChange?: (depth: number) => void;
    showPlayControls?: boolean;
    disableZoom?: boolean;
    clickableSelector?: string;
    onNodeHover?: (d: any, event: any) => void;
    renderFunction: ({
        container,
        data,
        context,
        props,
    }: RenderVisualisationProps) => void;
}

const BaseDecisionTreeVisualization: React.FC<
    BaseDecisionTreeVisualizationProps
> = ({
    data,
    transformTreeData,
    getTooltipContent,
    topControls,
    bottomInfo,
    nodeStyleConfig = {},
    maxDepth = 5,
    maxDisplayDepth,
    onDepthChange,
    showPlayControls = false,
    disableZoom = false,
    clickableSelector,
    renderFunction,
}) => {
    const { pathLineColor, pathFillColor } = nodeStyleConfig;

    console.log('[BaseVisualisation] Creating color scale with classes:', data?.classes);
    
    // Create a stable color mapping to prevent d3's ordinal scale from accumulating domain values
    const classColors = new Map<string, string>();
    const classes = data?.classes || [];
    const colors = DEFAULT_COLORS.slice(0, classes.length);

    classes.forEach((className: string, index: number) => {
        classColors.set(className, colors[index] || '#cccccc');
        // Also map the index as a string for histogram data compatibility
        classColors.set(index.toString(), colors[index] || '#cccccc');
    });

    console.log('[BaseVisualisation] Color scheme source: DEFAULT_COLORS (Observable10)');
    console.log('[BaseVisualisation] Color mapping:', Object.fromEntries(classColors));

    // Create a color scale function that uses the stable mapping
    // Handles both class names (e.g., "setosa") and class indices (e.g., "0")
    const colorScale = (className: string) => {
        const resolved = classColors.get(className) || '#cccccc';
        console.log(`[BaseVisualisation colorScale] "${className}" -> "${resolved}"`);
        return resolved;
    };
    
    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            treeData: any,
            context: VisualisationRenderContext
        ) => {
            const renderProps = {
                transformTreeData,
                getTooltipContent,
                pathLineColor,
                pathFillColor,
                colorScale,
            };

            return renderFunction({
                container,
                data: treeData,
                context,
                props: renderProps,
            });
        },
        [
            transformTreeData,
            getTooltipContent,
            pathLineColor,
            pathFillColor,
            colorScale,
        ]
    );

    const calculateMaxDepth = (node: TreeNode, depth = 0): number => {
        if (node.type === "leaf") return depth;
        const leftDepth = node.left
            ? calculateMaxDepth(node.left, depth + 1)
            : depth;
        const rightDepth = node.right
            ? calculateMaxDepth(node.right, depth + 1)
            : depth;
        return Math.max(leftDepth, rightDepth);
    };

    const actualMaxDepth = data?.tree ? calculateMaxDepth(data.tree) : maxDepth;
    const playableMaxSteps =
        (maxDisplayDepth !== undefined ? maxDisplayDepth : actualMaxDepth) + 1;
    const capabilities = {
        ...(showPlayControls && {
            playable: {
                maxSteps: playableMaxSteps,
                stepDuration: 1500, // Slower animations for better visibility
                showSlider: true,
                interpolationSteps: 60, // Smoother animations (higher = smoother)
                autoPlay: false, // Start paused so user can control
            },
        }),
        ...(!disableZoom && {
            zoomable: {
                scaleExtent: [1.0, 3] as [number, number], // Only allow zoom in from fit-to-view
                enableReset: true,
                enablePan: true,
                panMargin: 0, // Strict bounds - no margin to prevent content cutoff
                clickableSelector,
                // Provide extended content bounds for decision tree layout
                // Trees use depth spacing and can extend beyond standard content area
                contentBounds: {
                    width: 800,  // Will be updated by BaseVisualisation
                    height: 1200, // Extended height for tree depth (1.5x typical)
                },
            },
        }),
    };

    if (!data) return null;

    return (
        <BaseVisualisation
            dataConfig={{
                data,
                renderContent: renderCallback,
            }}
            capabilities={capabilities}
            controlsConfig={{
                controlsPosition: "top-left",
                controlsStyle: "overlay",
            }}
            layoutConfig={{
                topControls,
                bottomInfo,
            }}
            eventHandlers={{
                onStepChange: onDepthChange,
            }}
        />
    );
};

export default BaseDecisionTreeVisualization;
