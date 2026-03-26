/**
 * SVM Classification – Training Visualisation
 * Shows optimal trained boundary and support vectors.
 */

import { renderSVM } from "@/components/svm/SVMRenderer";
import { DEFAULT_2D_ZOOM_CONFIG } from "@/components/plots/utils/zoomConfig";
import BaseVisualisation from "@/components/visualisation/BaseVisualisation";
import type { VisualisationRenderContext } from "@/components/visualisation/types";
import { useSVMContext } from "@/contexts/models/SVMContext";
import * as d3 from "d3";
import { useCallback, useEffect } from "react";

const Visualisation: React.FC = () => {
    const {
        visualizationData,
        isVisualizationLoading,
        visualizationError,
        train,
        lastVisualizationParams,
        decisionBoundary,
    } = useSVMContext();

    useEffect(() => {
        if (!visualizationData && !isVisualizationLoading) {
            train(
                (lastVisualizationParams && Object.keys(lastVisualizationParams).length > 0)
                    ? lastVisualizationParams
                    : {}
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderCallback = useCallback(
        (
            container: d3.Selection<SVGGElement, unknown, null, undefined>,
            _data: unknown,
            context: VisualisationRenderContext
        ) => {
            if (!visualizationData) return;
            renderSVM({
                container,
                points: visualizationData.points ?? [],
                labels: visualizationData.labels ?? [],
                classNames: visualizationData.metadata?.class_names ?? ["Class 0", "Class 1"],
                supportVectorIndices: visualizationData.support_vector_indices,
                svContributions: (visualizationData as any).sv_contributions ?? [],
                boundaryResolution: (visualizationData as any).boundary_resolution ?? 50,
                x_range: visualizationData.x_range || [-5, 5],
                y_range: visualizationData.y_range || [-5, 5],
                xLabel: visualizationData.metadata?.feature_x_name ?? "Feature 1",
                yLabel: visualizationData.metadata?.feature_y_name ?? "Feature 2",
                context,
                decisionBoundary: decisionBoundary ?? undefined,
            });
        },
        [visualizationData, decisionBoundary]
    );

    if (isVisualizationLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Training classifier…</p>
                </div>
            </div>
        );
    }

    if (visualizationError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-destructive mb-2">Error training classifier</p>
                    <p className="text-sm text-muted-foreground">{visualizationError}</p>
                </div>
            </div>
        );
    }

    if (!visualizationData) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center p-8">
                    Apply parameters in the sidebar to train the classifier.
                </p>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <BaseVisualisation
                dataConfig={{
                    data: visualizationData,
                    renderContent: renderCallback,
                }}
                capabilities={{
                    zoomable: DEFAULT_2D_ZOOM_CONFIG,
                }}
                controlsConfig={{
                    controlsPosition: "top-left",
                    controlsStyle: "overlay",
                }}
            />
        </div>
    );
};

export default Visualisation;
