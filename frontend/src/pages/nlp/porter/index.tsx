import type { IndexPageProps } from "@/types/page";
import PorterLab from "./PorterLab";
import PorterFamilies from "./PorterFamilies";
import PorterExplore from "./PorterExplore";
export default function IndexPage({ name, narration, onComplete, replayKey = 0, subpageIndex = 0, onSubpageReady }: IndexPageProps) {
    switch (name) {
        case "Porter Explore":
            if (!onSubpageReady) break;
            return <PorterExplore key={`${subpageIndex}-${replayKey}`} narration={narration} subpageIndex={subpageIndex} onComplete={onComplete} onSubpageReady={onSubpageReady} />;
        case "Porter Lab": return <PorterLab key={replayKey} narration={narration} />;
        case "Porter Families": return <PorterFamilies key={replayKey} narration={narration} onComplete={onComplete} />;
    }
    return <div role="alert" className="p-4">Unknown Porter page: {name}</div>;
}
