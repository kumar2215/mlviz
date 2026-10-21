import { useStory } from "@/store/useStory";
import { useVisualisation } from "@/store/useVisualisation";

export function PageLoadingLabel({ children = "Loading page…" }: { children?: string }) {
    const hasStory = useStory(state => state.currentStory !== null);
    const hasVisualisation = useVisualisation(state => state.currentVisualisation !== null);
    return <>{hasStory && !hasVisualisation ? "Loading page…" : children}</>;
}

export default function PageLoading({ label = "Loading page…" }: { label?: string }) {
    return <div role="status" aria-live="polite" className="flex h-full min-h-0 w-full items-center justify-center p-4 text-center">
        <span className="font-mono text-2xl text-sky-600 motion-safe:animate-pulse"><PageLoadingLabel>{label}</PageLoadingLabel></span>
    </div>;
}
