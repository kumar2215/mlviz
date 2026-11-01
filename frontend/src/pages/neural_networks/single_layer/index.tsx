import type { IndexPageProps } from "@/types/page";
import { useLabSession } from "@/hooks/useLabSession";
import SingleLayerLab from "./SingleLayerLab";

export default function IndexPage({ name, replayKey }: IndexPageProps) {
    useLabSession("single_layer", name, replayKey);
    switch (name) {
        case "Single Layer Computation": return <SingleLayerLab view="matrix" />;
        case "Scores and Probabilities": return <SingleLayerLab view="scores" />;
        case "Language Identification": return <SingleLayerLab view="language" />;
        case "Feature Contributions": return <SingleLayerLab view="features" />;
        default: return <div role="alert">Unknown single-layer page: {name}</div>;
    }
}
