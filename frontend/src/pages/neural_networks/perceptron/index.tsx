import type { IndexPageProps } from "@/types/page";
import { useLabSession } from "@/hooks/useLabSession";
import PerceptronLab from "./PerceptronLab";

export default function IndexPage({ name, replayKey }: IndexPageProps) {
    useLabSession("perceptron", name, replayKey);
    switch (name) {
        case "Inside a Perceptron": return <PerceptronLab view="intro" />;
        case "Matrix Calculation": return <PerceptronLab view="matrix" />;
        case "Step and Sigmoid": return <PerceptronLab view="activation" />;
        case "Weight Updates": return <PerceptronLab view="updates" />;
        default: return <div role="alert">Unknown perceptron page: {name}</div>;
    }
}
