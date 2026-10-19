import BpeLab from "./bpe/BpeLab";
import BpeApply from "./bpe/BpeApply";
import type { IndexPageProps } from "@/types/page";
export default function IndexPage({ name, onComplete, replayKey = 0 }: IndexPageProps) {
    if (name === "BpeLab") return <BpeLab key={replayKey} onComplete={onComplete} />;
    if (name === "BpeApply") return <BpeApply key={replayKey} onComplete={onComplete} />;
    return <div role="alert" className="p-4">Unknown BPE page: {name}</div>;
}
