import { useLayoutEffect } from "react";
import { pathwayStore, usePathway } from "@/store/usePathway";
import type { PathwayDefinition, PathwayHistorySource } from "@/store/pathwayStore";

export default function usePathwaySession(sessionId: string, { pages, transitions }: PathwayDefinition, source: PathwayHistorySource) {
    const ready = usePathway(state => state.sessionId === sessionId);
    useLayoutEffect(() => {
        pathwayStore.getState().openSession(sessionId, { pages, transitions }, source);
        const unsubscribe = source.subscribe(history => {
            if (pathwayStore.getState().sessionId === sessionId) pathwayStore.getState().syncHistory(history);
        });
        pathwayStore.getState().start();
        const interval = setInterval(() => {
            if (pathwayStore.getState().sessionId === sessionId) pathwayStore.getState().refreshTime();
        }, 250);
        return () => { unsubscribe(); clearInterval(interval); };
    }, [sessionId, pages, transitions, source]);
    return ready;
}
