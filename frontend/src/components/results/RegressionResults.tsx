import { useLinearRegression } from "@/contexts/models/LinearRegressionContext";
import type { RegressionResultData } from "@/types/model";
import { ChartColumnIncreasing } from "lucide-react";
import MetricSection from "./MetricSection";

const Results = ({ metrics, metadata }: RegressionResultData) => {
    const { isEvaluating } = useLinearRegression();

    if (!metrics || !metadata || !metrics.train) {
        return <></>;
    }

    const { train, test } = metrics;
    const formatRegressionMetrics = (m: any) => ({
        "R²": m.r2,
        MSE: m.mse,
        RMSE: m.rmse,
        MAE: m.mae,
    });

    return (
        <div
            className={`h-full flex flex-col justify-start overflow-auto transition-opacity duration-200 ${isEvaluating ? "opacity-50" : "opacity-100"}`}
        >
            <p className="text-xl text-slate-800 flex items-center gap-2 mb-4">
                <ChartColumnIncreasing className="h-4 w-4" /> Metrics
                {isEvaluating && (
                    <span className="text-[10px] text-slate-400 animate-pulse uppercase tracking-widest ml-auto">
                        Evaluating…
                    </span>
                )}
            </p>

            <div className="flex flex-col gap-6">
                <MetricSection title="Train Set" metrics={formatRegressionMetrics(train)} />

                {test && (
                    <div className="w-full pt-4 border-t border-slate-200">
                        <MetricSection title="Test Set" metrics={formatRegressionMetrics(test)} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Results;
