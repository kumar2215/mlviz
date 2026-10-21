import BpeLab from "./bpe/BpeLab";
import BpeApply from "./bpe/BpeApply";
import BpeIntroduction from "./bpe/BpeIntroduction";
import BpeStoryLab from "./bpe/BpeStoryLab";
import type { IndexPageProps } from "@/types/page";
import useUserMode from "@/hooks/useUserMode";
export default function IndexPage({ name, narration, onComplete, replayKey = 0, onTaskComplete, completedTasks }: IndexPageProps) {
    const { userMode } = useUserMode();
    switch (name) {
        case "BPE Basics": return <BpeIntroduction key={replayKey} narration={narration} />;
        case "BPE Lab": return userMode === "story" ? <BpeStoryLab key={replayKey} narration={narration} onComplete={onComplete} onTaskComplete={onTaskComplete} completedTasks={completedTasks} /> : <BpeLab key={replayKey} narration={narration} onComplete={onComplete} />;
        case "BPE Apply": return <BpeApply key={replayKey} narration={narration} onComplete={onComplete} onTaskComplete={onTaskComplete} completedTasks={completedTasks} />;
        default: return <div role="alert" className="p-4">Unknown BPE page: {name}</div>;
    }
}
