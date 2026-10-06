// hooks/useResizeObserver.ts
import { useEffect, useRef, useState } from "react";

interface Dimensions {
    width: number;
    height: number;
}

export const useResizeObserver = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<Dimensions>({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return { ref, dimensions };
};
