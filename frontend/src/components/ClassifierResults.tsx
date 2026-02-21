import ConfusionMatrix from "@/components/ConfusionMatrix";
import type {
    ClassificationMetadata,
    ClassificationMetrics,
} from "@/types/model";
import { ChartColumnIncreasing } from "lucide-react";

interface DecisionTreeProps {
    metrics: ClassificationMetrics;
    metadata: ClassificationMetadata;
}

const roundNumber = (x: number) => String(x.toFixed(5));

const Results = ({ metrics, metadata }: DecisionTreeProps) => {
    console.log("[ClassifierResults]", metrics , metadata)
    
    if (metrics == null || metadata == null) {
        return <></>;
    }

    return (
        <div className="h-full flex flex-col justify-start overflow-auto">
            <div className="justify-items-center w-full">
                <p className="text-xl text-slate-800 flex items-center gap-2">
                    <ChartColumnIncreasing className="h-4 w-4" /> Metrics
                </p>

                {metrics == null ? (
                    <></>
                ) : (
                    <div className="w-full">
                        <ConfusionMatrix
                            classes={metadata.class_names}
                            matrix={metrics.confusion_matrix}
                        />
                    </div>
                )}
                <div className="w-full">
                    <div className="flex flex-wrap justify-between tracking-tight">
                        <p className="font-lg font-semibold">Accuracy</p>
                        <p className="font-mono">
                            {roundNumber(metrics.accuracy)}
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-between tracking-tight">
                        <p className="font-lg font-semibold">Recall</p>
                        <p className="font-mono">
                            {roundNumber(metrics.recall)}
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-between  tracking-tight">
                        <p className="font-lg font-semibold">Precision</p>
                        <p className="font-mono">
                            {roundNumber(metrics.precision)}
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-between tracking-tight">
                        <p className="font-lg font-semibold">F1</p>
                        <p className="font-mono">{roundNumber(metrics.f1)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Results;
