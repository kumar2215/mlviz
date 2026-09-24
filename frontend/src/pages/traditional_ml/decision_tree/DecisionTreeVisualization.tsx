import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationCapabilities, VisualisationDataConfig } from "@/components/visualisation/types";
import { renderDecisionTree } from "@/pages/traditional_ml/decision_tree/DecisionTreeRenderer";
import { useDecisionTree } from "@/store/traditional_ml/useDecisionTree";
import type { TreeNode } from "@/types/model";
import { DEFAULT_COLORS } from "@/utils/colorUtils";
import { useCallback, useEffect, useMemo } from "react";
import ManualTreeHUD from "./ManualTreeHUD";

const capabilities: VisualisationCapabilities = {
    zoomable: {
        scaleExtent: [1.0, 3],
        enableReset: true,
        enablePan: true,
        panMargin: 0,
        clickableSelector: ".node",
        contentBounds: {
            width: 800,
            height: 1200,
        },
    },
};

export default function DecisionTreeVisualization() {
    const {
        manualTree,
        getFeatureNames,
        getClassNames,
    } = useDecisionTree();


    useEffect(() => {
        manualTree.initialize();
    }, []);

    // All hooks must be called before any early returns
    useEffect(() => {
        if (!manualTree.tree) {
            manualTree.initialize();
        }
    }, [manualTree]);
    
    const handleNodeClick = useCallback((path: number[]) => {
        manualTree.selectNode(path);
    }, [manualTree]);
    
    // Define transformTreeData before early return (hooks must be called in same order)
    const transformTreeData = useCallback((node: TreeNode, depth = 0): any => {
        const base = {
            name: node.type === 'leaf' ? 'Leaf' : (node as any).feature,
            type: node.type,
            samples: node.samples,
            impurity: node.impurity,
            depth,
            feature: (node as any).feature,
            threshold: (node as any).threshold,
            value: node.value,
            histogram_data: (node as any).histogram_data || null, // Include histogram data for split nodes
            terminal: (node as any).terminal || false, // Include terminal flag
            isOnPath: (node as any).isOnPath || false,
        };
        
        if (node.type === 'split') {
            const splitNode = node as any; // Type assertion for split node
            if (splitNode.left && splitNode.right) {
                return {
                    ...base,
                    children: [
                        transformTreeData(splitNode.left, depth + 1),
                        transformTreeData(splitNode.right, depth + 1),
                    ],
                };
            }
        }
        
        return base;
    }, []);

    const classes = getClassNames();
    const colorScale = useMemo(() => {
        const classColors = new Map<string, string>();

        (classes || []).forEach((className: string, index: number) => {
            const color = DEFAULT_COLORS[index] || '#cccccc';
            classColors.set(className, color);
            // Histograms use class indices instead of names.
            classColors.set(index.toString(), color);
        });

        return (className: string) => classColors.get(className) || '#cccccc';
    }, [classes]);

    const renderManualDecisionTree = useCallback<VisualisationDataConfig["renderContent"]>(
        (container, data, context) => renderDecisionTree({
            container,
            data,
            context,
            props: {
                transformTreeData,
                colorScale,
                selectedNodePath: manualTree.selectedNodePath,
                featureNames: getFeatureNames() || [],
                featureStats: manualTree.featureStats,
                selectedFeature: manualTree.selectedFeature,
                selectedThreshold: manualTree.selectedThreshold,
                manualCallbacks: {
                    onNodeClick: handleNodeClick,
                    onFeatureSelect: manualTree.loadFeatureStats,
                    onThresholdChange: manualTree.updateThreshold,
                    onSplit: manualTree.splitNode,
                    onCancel: () => manualTree.selectNode(null),
                    onMarkAsLeaf: manualTree.markAsLeaf,
                },
            },
            mode: "manual",
        }),
        [transformTreeData, colorScale, manualTree, getFeatureNames, handleNodeClick]
    );

    
    if (!manualTree.tree) {
        console.log('[ManualTree] No tree yet, returning empty');
        return <></>;
    }
    
    return (
        <div className="relative h-full w-full">
            {/* Control HUD */}
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-4 w-96">
                <ManualTreeHUD />
            </div>

            <BaseVisualisation
                dataConfig={{
                    data: {
                        tree: manualTree.tree,
                        classes: classes || [],
                    },
                    renderContent: renderManualDecisionTree,
                }}
                capabilities={capabilities}
                controlsConfig={{
                    controlsPosition: "top-left",
                    controlsStyle: "overlay",
                }}
            />
        </div>
    );
};
