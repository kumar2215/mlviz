import type { IndexPageProps } from "@/types/page";
import { useLabSession } from "@/hooks/useLabSession";
import MlpLab from "./MlpLab";

export default function IndexPage({ name, replayKey }: IndexPageProps) {
    useLabSession("mlp", name, replayKey);
    switch (name) {
        case "Why Nonlinearity": return <MlpLab view="xor" />;
        case "Activation Functions": return <MlpLab view="activation" />;
        case "Forward Computation": return <MlpLab view="forward" />;
        case "Dropout Masks": return <MlpLab view="dropout" />;
        case "Dropout Variants": return <MlpLab view="variants" />;
        default: return <div role="alert">Unknown MLP page: {name}</div>;
    }
}
