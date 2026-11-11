import BpeLab from "./bpe/BpeLab";
import BpeApply from "./bpe/BpeApply";
import BpeIntroduction from "./bpe/BpeIntroduction";
import BpeStoryLab from "./bpe/BpeStoryLab";
import type { IndexPageProps } from "@/types/page";
import useUserMode from "@/hooks/useUserMode";
export default function IndexPage({ name, narration, onComplete, replayKey = 0, subpageIndex = 0, onSubpageReady, onTaskComplete, completedTasks }: IndexPageProps) {
    const { userMode } = useUserMode();
    switch (name) {
        case "BPE Basics": return <BpeIntroduction key={`${subpageIndex}-${replayKey}`} narration={narration} subpageIndex={subpageIndex} onSubpageReady={onSubpageReady} onComplete={onComplete} />;
        case "BPE Lab": return userMode === "story" ? <BpeStoryLab key={replayKey} narration={narration} onComplete={onComplete} onTaskComplete={onTaskComplete} completedTasks={completedTasks} /> : <BpeLab key={replayKey} narration={narration} onComplete={onComplete} />;
        case "BPE Apply": return <BpeApply key={replayKey} narration={narration} onComplete={onComplete} onTaskComplete={onTaskComplete} completedTasks={completedTasks} />;
        default: return <div role="alert" className="p-4">Unknown BPE page: {name}</div>;
    }
}
