import { useEffect, useState } from "react";

/**
 * Calculates the scale factor based on screen width/breakpoints.
 * This matches the index.css scaling logic.
 */
export const getScaleFactor = () => {
    if (typeof window === "undefined") return 1.0;
    const width = window.innerWidth;
    if (width >= 3840) return 2.0; // 4k
    if (width >= 2560) return 1.5; // 1440p
    if (width >= 1536) return 1.2; // 2xl
    if (width >= 1280) return 1.1; // xl
    return 1.0;
};

/**
 * A hook that provides the current scale factor and updates on resize.
 */
export const useScaleFactor = () => {
    const [scaleFactor, setScaleFactor] = useState(getScaleFactor());

    useEffect(() => {
        const handleResize = () => {
            setScaleFactor(getScaleFactor());
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return scaleFactor;
};
