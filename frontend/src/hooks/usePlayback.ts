import { useEffect } from "react";

export function usePlayback(playing: boolean, tick: () => void, stop: () => void, delay = 700) {
    useEffect(() => {
        if (!playing) return;
        const timer = window.setInterval(tick, delay);
        return () => { window.clearInterval(timer); stop(); };
    }, [playing, tick, stop, delay]);
    useEffect(() => () => stop(), [stop]);
}
