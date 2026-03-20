import React from "react";

export const formatMetric = (x: number) =>
    x.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

export interface MetricSectionProps {
    title: string;
    metrics: Record<string, number>;
    children?: React.ReactNode;
}

const MetricSection: React.FC<MetricSectionProps> = ({ title, metrics, children }) => {
    return (
        <div className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
            {children && <div className="w-full overflow-hidden">{children}</div>}
            <div className="flex flex-col text-sm">
                {Object.entries(metrics).map(([metric, value]) => (
                    <div key={metric} className="flex justify-between tracking-tight">
                        <p className="font-semibold text-slate-600 capitalize">
                            {metric}
                        </p>
                        <p className="font-mono text-slate-800 w-24 text-right tabular-nums">
                            {formatMetric(value)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MetricSection;
