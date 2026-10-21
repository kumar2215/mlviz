import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useDragSelectionStore } from "@/store/useDragSelectionStore";

export default function useDragSelection<Element extends HTMLElement>() {
    const ref = useRef<Element>(null);
    const [surfaceId, setSurfaceId] = useState<string | null>(null);
    // Resolve DOM ownership once; shared selection state is held only in Zustand.
    useLayoutEffect(() => {
        setSurfaceId(ref.current?.closest<HTMLElement>("[data-drag-surface]")?.dataset.dragSurface ?? null);
    }, []);
    const selected = useDragSelectionStore(state => surfaceId ? state.selections[surfaceId] ?? null : null);
    const select = useCallback((itemId: string | null) => {
        if (surfaceId) useDragSelectionStore.getState().select(surfaceId, itemId);
    }, [surfaceId]);
    return { ref, selected, select };
}
