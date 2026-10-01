import BpeMerge from "./bpe/BpeMerge";
import BpeTraining from "./bpe/BpeTraining";
import BpeWalkthrough from "./bpe/BpeWalkthrough";
import type { IndexPageProps } from "@/types/page";
import { useDataset } from "@/store/useDataset";

export default function IndexPage({ name, subpageIndex = 0, replayKey = 0, onSubpageReady, completionButtonId }: IndexPageProps) {
    const dataset = useDataset(state => state.activeDataset);
    if (dataset?.type !== "predefined_bpe" || !onSubpageReady || !completionButtonId) {
        return <div role="alert" className="p-4">BPE page configuration is incomplete.</div>;
    }
    const props = { dataset, subpageIndex, replayKey, onSubpageReady, completionButtonId };
    switch (name) {
        case "BpeWalkthrough": return <BpeWalkthrough key={`walkthrough-${replayKey}`} {...props} />;
        case "BpeMerge": return <BpeMerge key={`merge-${replayKey}`} {...props} />;
        case "BpeTraining": return <BpeTraining key={`training-${replayKey}`} {...props} />;
        default: return <div>Unknown BPE page: {name}</div>;
    }
}
