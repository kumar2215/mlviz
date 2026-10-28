import type { IndexPageProps } from "@/types/page";
import { useLabSession } from "@/hooks/useLabSession";
import TrainingLab, { LossExplorer } from "./TrainingLab";

export default function IndexPage({ name, replayKey }: IndexPageProps) {
    useLabSession("training", name, replayKey);
    switch (name) {
        case "Loss Functions": return <LossExplorer />;
        case "Chain Rule": return <TrainingLab view="chain" />;
        case "Backward Propagation": return <TrainingLab view="backward" />;
        case "Gradient Descent Updates": return <TrainingLab view="updates" />;
        default: return <div role="alert">Unknown training page: {name}</div>;
    }
}
