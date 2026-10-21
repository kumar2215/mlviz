import BpeLab from "./bpe/BpeLab";
import BpeApply from "./bpe/BpeApply";
import BpeIntroduction from "./bpe/BpeIntroduction";
import BpeStoryLab from "./bpe/BpeStoryLab";
import type { IndexPageProps } from "@/types/page";
export default function IndexPage({ name, narration, onComplete, replayKey = 0 }: IndexPageProps) {
    switch (name) {
        case "BPE Basics": return <BpeIntroduction key={replayKey} narration={narration} />;
        case "BPE Lab": return narration ? <BpeStoryLab key={replayKey} narration={narration} onComplete={onComplete} /> : <BpeLab key={replayKey} onComplete={onComplete} />;
        case "BPE Apply": return <BpeApply key={replayKey} narration={narration} onComplete={onComplete} />;
        default: return <div role="alert" className="p-4">Unknown BPE page: {name}</div>;
    }
}
