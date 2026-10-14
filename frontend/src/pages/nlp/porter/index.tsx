import type { IndexPageProps } from "@/types/page";
import PorterLab from "./PorterLab";
import PorterFamilies from "./PorterFamilies";
import PorterExplore from "./PorterExplore";
export default function IndexPage({ name, completionButtonId, replayKey = 0, subpageIndex = 0, onSubpageReady }: IndexPageProps) {
    if (name === "PorterExplore" && completionButtonId && onSubpageReady) return <PorterExplore key={`${subpageIndex}-${replayKey}`} subpageIndex={subpageIndex} completionButtonId={completionButtonId} onSubpageReady={onSubpageReady} />;
    if (name === "PorterLab") return <PorterLab key={replayKey} />;
    if (name === "PorterFamilies" && completionButtonId) return <PorterFamilies key={replayKey} completionButtonId={completionButtonId} />;
    return <div role="alert" className="p-4">Unknown Porter page: {name}</div>;
}
