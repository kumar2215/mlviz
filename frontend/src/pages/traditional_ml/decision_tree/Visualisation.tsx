import BaseDecisionTreeVisualization from "@/pages/traditional_ml/decision_tree/BaseVisualisation";
import { renderDecisionTree } from "@/pages/traditional_ml/decision_tree/DecisionTreeRenderer";
import type { RenderVisualisationProps } from "@/types/traditional_ml/decision_tree";
import { useDecisionTree } from "@/pages/traditional_ml/decision_tree/DecisionTreeContext";
import type { TreeNode } from "@/types/model";
import { useCallback, useEffect } from "react";
import ManualTreeHUD from "./ManualTreeHUD";

const Visualisation: React.FC = () => {
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
        console.log('[ManualTree] useEffect - manualTree:', manualTree.tree);
        if (!manualTree.tree) {
            console.log('[ManualTree] Initializing manual tree');
            manualTree.initialize();
        }
    }, [manualTree]);
    
    const handleNodeClick = useCallback((path: number[]) => {
        console.log('[ManualTree] handleNodeClick called with path:', path);
        manualTree.selectNode(path);
    }, [manualTree]);
    
    const renderManualDecisionTree = useCallback((props: RenderVisualisationProps) => {
        console.log('[ManualTree] renderManualDecisionTree called');
        console.log('[ManualTree] Props:', props);
        console.log('[ManualTree] Selected path:', manualTree.selectedNodePath);
        console.log('[ManualTree] Feature stats:', manualTree.featureStats);
        
        // Add manual-specific props to the render props
        const enhancedProps = {
            ...props.props,
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
        };
        
        console.log('[ManualTree] Enhanced props:', enhancedProps);
        
        return renderDecisionTree({ 
            ...props, 
            props: enhancedProps,
            mode: "manual" 
        });
    }, [manualTree, getFeatureNames, handleNodeClick]);
    
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
    
    // Early return after all hooks
    console.log('[ManualTree] Render - manualTree:', manualTree.tree);
    console.log('[Manual Visualisation] getClassNames():', getClassNames());
    
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

            <BaseDecisionTreeVisualization
                data={{ 
                    tree: manualTree.tree, 
                    classes: getClassNames() || [] 
                }}
                transformTreeData={transformTreeData}
                renderFunction={renderManualDecisionTree}
                clickableSelector=".node"
            />
        </div>
    );
};

export default Visualisation;
