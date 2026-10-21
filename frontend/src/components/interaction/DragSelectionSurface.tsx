import { useId, useLayoutEffect, type ReactNode } from "react";
import { useDragSelectionStore } from "@/store/useDragSelectionStore";

export default function DragSelectionSurface({ children }: { children: ReactNode }) {
    const surfaceId = useId();
    useLayoutEffect(() => {
        useDragSelectionStore.getState().registerSurface(surfaceId);
        return () => useDragSelectionStore.getState().removeSurface(surfaceId);
    }, [surfaceId]);
    return <div className="contents" data-drag-surface={surfaceId}>{children}</div>;
}
