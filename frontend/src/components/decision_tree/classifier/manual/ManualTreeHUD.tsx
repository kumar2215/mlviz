import {
    prepareHistogramData,
    renderHistogramBars
} from "@/components/charts/histogramUtils";
import { Button } from "@/components/ui/button";
import { DEFAULT_COLORS } from "@/utils/colorUtils";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDecisionTree } from "@/contexts/models/DecisionTreeContext";
import * as d3 from "d3";
import { GitBranch, Leaf, Split, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import {
    renderInformationGainGraph
} from "../rendererUtils";

const ManualTreeHUD: React.FC = () => {
    const {
        manualTree,
        getFeatureNames,
        getClassNames,
    } = useDecisionTree();

    const {
        selectedNodePath,
        featureStats,
        selectedFeature,
        selectedThreshold,
        loadFeatureStats,
        updateThreshold,
        splitNode,
        markAsLeaf,
        selectNode,
    } = manualTree;

    const vizRef = useRef<SVGSVGElement>(null);
    const exploredIndicesCache = useRef(new Map<string, Set<number>>());

    const featureNames = useMemo(() => getFeatureNames() || [], [getFeatureNames]);
    const classNames = useMemo(() => getClassNames() || [], [getClassNames]);

    // Clear exploration cache when the selected node changes
    useEffect(() => {
        exploredIndicesCache.current.clear();
    }, [selectedNodePath]);

    useEffect(() => {
        if (!vizRef.current || !featureStats || !selectedFeature) return;

        const svg = d3.select(vizRef.current);
        svg.selectAll("*").remove();

        const width = 368; 
        const histHeight = 100;
        const graphHeight = 95;
        const totalHeight = histHeight + graphHeight;
        const leftMargin = 45;
        const adjustedHistWidth = width - leftMargin - 10;

        const featureRange = featureStats.feature_range;
        const currentThreshold = selectedThreshold ?? (featureStats.thresholds.length > 0 ? featureStats.thresholds[0].threshold : 0);

        // Render histogram
        const histGroup = svg.append('g')
            .attr('transform', `translate(${leftMargin}, 0)`);
        const stackedData = prepareHistogramData(featureStats.histogram_data);
        
        const colorScheme = Object.keys(featureStats.histogram_data.counts_by_class).map((_, i) => {
            return DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        });

        console.log('[ManualTreeHUD] Histogram color scheme source: DEFAULT_COLORS (Observable10)');
        console.log('[ManualTreeHUD] Histogram colorScheme array:', colorScheme);
        console.log('[ManualTreeHUD] Histogram class keys:', Object.keys(featureStats.histogram_data.counts_by_class));
        console.log('[ManualTreeHUD] classNames from context:', classNames);

        renderHistogramBars(histGroup, featureStats.histogram_data, stackedData, {
            width: adjustedHistWidth,
            height: histHeight,
            showThreshold: false,
            colorScheme,
        });

        // Render info gain graph
        const graphGroup = svg.append('g')
            .attr('transform', `translate(0, ${histHeight})`);

        if (!exploredIndicesCache.current.has(selectedFeature)) {
            exploredIndicesCache.current.set(selectedFeature, new Set<number>());
        }
        const existingExploredIndices = exploredIndicesCache.current.get(selectedFeature);

        const { exploredIndices } = renderInformationGainGraph(
            graphGroup,
            featureStats.thresholds,
            currentThreshold,
            featureStats.feature_range as [number, number],
            width,
            graphHeight,
            existingExploredIndices
        );

        exploredIndicesCache.current.set(selectedFeature, exploredIndices);

        // Threshold line
        const thresholdX = leftMargin + ((currentThreshold - featureRange[0]) / (featureRange[1] - featureRange[0])) * adjustedHistWidth;
        
        svg.append('line')
            .attr('x1', thresholdX)
            .attr('x2', thresholdX)
            .attr('y1', 0)
            .attr('y2', totalHeight)
            .attr('stroke', '#4f46e5')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        svg.append('text')
            .attr('x', thresholdX)
            .attr('y', 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#4f46e5')
            .attr('font-weight', 'bold')
            .text(currentThreshold.toFixed(2));

    }, [featureStats, selectedFeature, selectedThreshold, classNames]);

    if (selectedNodePath === null) return null;

    return (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Split Node
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200/50" onClick={() => selectNode(null)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Feature
                    </Label>
                    <Select value={selectedFeature || ""} onValueChange={loadFeatureStats}>
                        <SelectTrigger className="w-full bg-white border-slate-200 shadow-sm transition-all hover:border-slate-300">
                            <SelectValue placeholder="Select feature..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                            {featureNames.map(name => (
                                <SelectItem key={name} value={name} className="hover:bg-slate-50">{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {featureStats && selectedFeature ? (
                    <>
                        <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-inner overflow-hidden">
                            <svg ref={vizRef} width="100%" height="195" viewBox="0 0 368 195" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Threshold
                                </Label>
                                <span className="text-sm font-mono font-bold text-primary">
                                    {selectedThreshold?.toFixed(3) || (featureStats.thresholds.length > 0 ? featureStats.thresholds[0].threshold : 0).toFixed(3)}
                                </span>
                            </div>
                            <Slider 
                                value={[selectedThreshold || (featureStats.thresholds.length > 0 ? featureStats.thresholds[0].threshold : 0)]}
                                min={featureStats.feature_range[0]}
                                max={featureStats.feature_range[1]}
                                step={(featureStats.feature_range[1] - featureStats.feature_range[0]) / 100}
                                onValueChange={(vals: number[]) => updateThreshold(vals[0])}
                                className="py-2"
                            />
                        </div>
                    </>
                ) : (
                    <div className="h-[250px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <p className="text-xs text-slate-400 italic">Select a feature to begin splitting</p>
                    </div>
                )}

                <div className="flex flex-row gap-2 pt-2">
                    <Button 
                        className="w-1/2 h-auto py-2 gap-2 bg-gradient-to-r from-green-100 to-blue-100 text-black border-none hover:from-green-200 hover:to-blue-200 shadow-md transition-all active:scale-[0.98] whitespace-normal text-center flex items-center justify-center px-2"
                        disabled={!selectedFeature || selectedThreshold === null}
                        onClick={splitNode}
                    >
                        <Split className="w-4 h-4 shrink-0" /> <span className="text-xs">Split Node</span>
                    </Button>
                    <Button 
                        className="w-1/2 h-auto py-2 gap-2 bg-gradient-to-r from-red-100 to-fuchsia-100 text-black border-none hover:from-red-200 hover:to-fuchsia-200 shadow-md transition-all active:scale-[0.98] whitespace-normal text-center flex items-center justify-center px-2"
                        onClick={markAsLeaf}
                    >
                        <Leaf className="w-4 h-4 shrink-0" /> <span className="text-xs">Mark as Leaf</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ManualTreeHUD;
