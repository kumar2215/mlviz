import { Button } from "@/components/ui/button";
import ActivityIntroduction from "@/components/layout/ActivityIntroduction";
import type { ActivityNarrationProps, IndexPageProps } from "@/types/page";
import { useState } from "react";
import FollowQuestions from "./FollowQuestions";
import NameTreeParts from "./NameTreeParts";
import CompareIrisSplits from "./CompareIrisSplits";
import TraceTraining from "./TraceTraining";
import { Frame, Result, selectedClass } from "./shared";

function FinalPrediction({ narration }: ActivityNarrationProps) {
    const [length, setLength] = useState(1.5);
    const [width, setWidth] = useState(0.3);
    const [shown, setShown] = useState(false);
    const species = length <= 2.5 ? "Setosa" : width <= 1.7 ? "Versicolor" : "Virginica";
    const route = length <= 2.5 ? "Length ≤ 2.5 → Yes" : `Length ≤ 2.5 → No · Width ≤ 1.7 → ${width <= 1.7 ? "Yes" : "No"}`;
    return <Frame>
        <ActivityIntroduction narration={narration}>
            <h2 className="text-lg font-semibold">Make a prediction</h2>
            <p className="text-sm text-slate-600">Adjust the measurements and check where the simple example tree sends the flower.</p>
        </ActivityIntroduction>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 rounded-xl bg-slate-50 p-5">
                <label className="font-medium">Petal length: {length.toFixed(1)} cm<input className="mt-2 w-full accent-blue-600" type="range" min="1" max="7" step="0.1" value={length} onChange={event => { setLength(Number(event.target.value)); setShown(false); }} /></label>
                <label className="font-medium">Petal width: {width.toFixed(1)} cm<input className="mt-2 w-full accent-blue-600" type="range" min="0.1" max="2.5" step="0.1" value={width} onChange={event => { setWidth(Number(event.target.value)); setShown(false); }} /></label>
                <Button className={selectedClass} onClick={() => setShown(true)}>Follow the tree</Button>
            </div>
            <div className="flex flex-col justify-center gap-3 rounded-xl border border-blue-100 p-5"><p className="rounded-lg bg-blue-50 p-3">Length ≤ 2.5 cm? → Setosa if yes</p><p className="rounded-lg bg-blue-50 p-3">Otherwise, width ≤ 1.7 cm? → Versicolor if yes, Virginica if no</p>{shown && <Result success><strong>{species}</strong><br />{route}</Result>}</div>
        </div>
    </Frame>;
}

export default function LessonPage({ name, narration, subpageIndex, onSubpageReady, onComplete }: IndexPageProps) {
    switch (name) {
        case "Follow Questions": return <FollowQuestions narration={narration} onComplete={onComplete} />;
        case "Name Tree Parts": return <NameTreeParts narration={narration} onComplete={onComplete} />;
        case "Compare Iris Splits": return <CompareIrisSplits narration={narration} subpageIndex={subpageIndex} onSubpageReady={onSubpageReady} onComplete={onComplete} />;
        case "Trace Training": return <TraceTraining narration={narration} onComplete={onComplete} />;
        case "Final Prediction": return <FinalPrediction narration={narration} />;
        default: return <div role="alert" className="p-4">Unknown decision tree page: {name}</div>;
    }
}
