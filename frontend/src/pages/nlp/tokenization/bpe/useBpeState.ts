import { loadBpeState, type BpeState } from "@/api/bpe";
import type { PredefinedBpeDataset } from "@/types/dataset";
import { useEffect, useState } from "react";

export function useBpeState(dataset: PredefinedBpeDataset, replayKey: number) {
    const [state, setState] = useState<BpeState | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        loadBpeState(dataset).then(result => {
            if (active) {
                setState(result);
                setError(null);
            }
        }).catch(reason => {
            if (active) {
                setState(null);
                setError(reason instanceof Error ? reason.message : "Could not load BPE data");
            }
        });
        return () => { active = false; };
    }, [dataset, replayKey]);

    return { state, error };
}
