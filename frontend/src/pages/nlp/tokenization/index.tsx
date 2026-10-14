import BpeLab from "./bpe/BpeLab";
import BpeApply from "./bpe/BpeApply";
import type { IndexPageProps } from "@/types/page";
export default function IndexPage({ name, completionButtonId, replayKey = 0 }: IndexPageProps) {
    if (!completionButtonId) return <div role="alert" className="p-4">BPE completion configuration is missing.</div>;
    if (name === "BpeLab") return <BpeLab key={replayKey} completionButtonId={completionButtonId} />;
    if (name === "BpeApply") return <BpeApply key={replayKey} completionButtonId={completionButtonId} />;
    return <div role="alert" className="p-4">Unknown BPE page: {name}</div>;
}
