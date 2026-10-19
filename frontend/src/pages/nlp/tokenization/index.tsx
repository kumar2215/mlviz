import BpeLab from "./bpe/BpeLab";
import BpeApply from "./bpe/BpeApply";
import type { IndexPageProps } from "@/types/page";
export default function IndexPage({ name, onComplete, replayKey = 0 }: IndexPageProps) {
    switch (name) {
        case "BPE Lab": return <BpeLab key={replayKey} onComplete={onComplete} />;
        case "BPE Apply": return <BpeApply key={replayKey} onComplete={onComplete} />;
        default: return <div role="alert" className="p-4">Unknown BPE page: {name}</div>;
    }
}
