/**
 * Line Control HUD
 * Radial arc dial for slope + normal range slider for intercept.
 * Used in both the visualise, train, and step pages.
 */
import RadialSlopeSlider from "@/components/linear/regression/RadialSlopeSlider";
import CollapsibleHUD from "@/components/visualisation/CollapsibleHUD";
import { useLinearRegression } from "@/contexts/models/LinearRegressionContext";
import { useScaleFactor } from "@/hooks/useScaleFactor";
import { TrendingUp } from "lucide-react";
import React, { useId } from "react";

interface LineControlHUDProps {
    /** Override intercept slider range (defaults to data-derived) */
    interceptRange?: [number, number];
}

const LineControlHUD: React.FC<LineControlHUDProps> = ({ interceptRange }) => {
    const scaleFactor = useScaleFactor();
    const {
        currentSlope,
        currentIntercept,
        setCurrentLine,
        computeR2,
        visualizationData,
        evaluateLine,
    } = useLinearRegression();

    const interceptId = useId();

    // Span from visualise/train response — needed for the angle→slope conversion
    const xRange = (visualizationData as any)?.x_range as
        | [number, number]
        | undefined;
    const yRange = (visualizationData as any)?.y_range as
        | [number, number]
        | undefined;
    const xSpan = xRange ? xRange[1] - xRange[0] : 1;
    const ySpan = yRange ? yRange[1] - yRange[0] : 1;

    // Intercept slider range: use backend hints if available, otherwise y domain
    const hints = (visualizationData as any)?.slider_hints;
    const iMin =
        interceptRange?.[0] ??
        hints?.intercept_min ??
        (yRange ? -ySpan * 1.5 : -500);
    const iMax =
        interceptRange?.[1] ??
        hints?.intercept_max ??
        (yRange ? ySpan * 1.5 : 500);
    const iStep = (iMax - iMin) / 1000;

    const r2 = computeR2(currentSlope, currentIntercept);

    const r2Color =
        r2 >= 0.9
            ? "text-emerald-600"
            : r2 >= 0.7
              ? "text-blue-600"
              : r2 >= 0.5
                ? "text-amber-600"
                : "text-red-500";

    const fs = (n: number) => `${n * scaleFactor}px`;

    return (
        <CollapsibleHUD
            icon={
                <TrendingUp
                    style={{ width: fs(14), height: fs(14) }}
                    className="text-indigo-500"
                />
            }
            title="Line Controls"
            style={{ width: fs(272) }}
        >
            {/* R² live readout
            <div
                className="rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center mb-4"
                style={{ padding: fs(10), gap: fs(2) }}
            >
                <span className="uppercase tracking-widest text-slate-400 font-semibold" style={{ fontSize: fs(9) }}>
                    Live R²
                </span>
                <span className={`font-mono font-bold ${r2Color}`} style={{ fontSize: fs(26) }}>
                    {r2.toFixed(4)}
                </span>
            </div> */}

            {/* Intercept — standard range slider */}
            <div
                className="flex flex-col"
                style={{ gap: fs(4), marginBottom: fs(10) }}
            >
                <div className="flex justify-between">
                    <label
                        htmlFor={interceptId}
                        className="text-slate-500 font-medium"
                        style={{ fontSize: fs(12) }}
                    >
                        Intercept (b)
                    </label>
                    <span
                        className="font-mono text-indigo-600 font-bold"
                        style={{ fontSize: fs(12) }}
                    >
                        {currentIntercept.toFixed(1)}
                    </span>
                </div>
                <input
                    id={interceptId}
                    type="range"
                    min={iMin}
                    max={iMax}
                    step={iStep}
                    value={currentIntercept}
                    onChange={(e) =>
                        setCurrentLine(currentSlope, parseFloat(e.target.value))
                    }
                    onMouseUp={() =>
                        evaluateLine(currentSlope, currentIntercept)
                    }
                    onTouchEnd={() =>
                        evaluateLine(currentSlope, currentIntercept)
                    }
                    className="w-full accent-indigo-500"
                />
            </div>

            {/* Slope — radial arc dial */}
            <div
                className="flex flex-col items-center mb-4"
                style={{ gap: fs(2) }}
            >
                <div
                    className="flex justify-between w-full"
                    style={{ marginBottom: fs(2) }}
                >
                    <span
                        className="text-slate-500 font-medium"
                        style={{ fontSize: fs(12) }}
                    >
                        Slope (m)
                    </span>
                    <span
                        className="font-mono text-indigo-600 font-bold"
                        style={{ fontSize: fs(12) }}
                    >
                        {currentSlope.toFixed(4)}
                    </span>
                </div>
                <RadialSlopeSlider
                    slope={currentSlope}
                    onSlopeChange={(s) => setCurrentLine(s, currentIntercept)}
                    onSlopeChangeEnd={(s) => evaluateLine(s, currentIntercept)}
                    xSpan={xSpan}
                    ySpan={ySpan}
                    size={Math.round(230 * scaleFactor)}
                />
            </div>

            {/* Equation preview */}
            <div
                className="rounded-lg bg-slate-50 border border-slate-100 text-center font-mono text-slate-600"
                style={{ padding: fs(6), fontSize: fs(11) }}
            >
                y = {currentSlope.toFixed(3)}x{" "}
                {currentIntercept >= 0 ? "+" : "−"}{" "}
                {Math.abs(currentIntercept).toFixed(1)}
            </div>
        </CollapsibleHUD>
    );
};

export default LineControlHUD;
