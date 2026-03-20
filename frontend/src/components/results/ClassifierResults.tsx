import ConfusionMatrix from "@/components/results/ConfusionMatrix";
import type { ClassifierResultData } from "@/types/model";
import { ChartColumnIncreasing } from "lucide-react";
import MetricSection from "./MetricSection";

const Results = ({ metrics, metadata }: ClassifierResultData) => {
    if (!metrics || !metadata || !metrics.train) {
        return <></>;
    }

    const { train, test } = metrics;
    const formatClassificationMetrics = (m: any) => ({
        Accuracy: m.accuracy,
        Recall: m.recall,
        Precision: m.precision,
        "F1 Score": m.f1,
    });

    return (
        <div className="h-full flex flex-col justify-start overflow-auto">
            <p className="text-xl text-slate-800 flex items-center gap-2 mb-4">
                <ChartColumnIncreasing className="h-4 w-4" /> Metrics
            </p>

            <div className="flex flex-col gap-6">
                <MetricSection
                    title="Train Set"
                    metrics={formatClassificationMetrics(train)}
                >
                    <ConfusionMatrix
                        classes={metadata.class_names}
                        matrix={train.confusion_matrix}
                    />
                </MetricSection>

                {test && (
                    <div className="w-full pt-4 border-t border-slate-200">
                        <MetricSection
                            title="Test Set"
                            metrics={formatClassificationMetrics(test)}
                        >
                            <ConfusionMatrix
                                classes={metadata.class_names}
                                matrix={test.confusion_matrix}
                            />
                        </MetricSection>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Results;
