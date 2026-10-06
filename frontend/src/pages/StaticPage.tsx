import MarkdownWrapper from "@/components/markdown/MarkdownWrapper";
import type { StaticPageParameters } from "@/types/page";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const StaticPage: React.FC<StaticPageParameters> = ({ text, path }) => {
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState<boolean>(false);
    const [resizeCount, setResizeCount] = useState<number>(0);
    const lastDimensionsRef = useRef<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        // If raw text is provided, use it directly
        if (text) {
            setContent(text);
            return;
        }

        // If path is provided, fetch the markdown file
        if (path) {
            setLoading(true);
            setError(null);

            fetch(path)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to load markdown file: ${response.statusText}`,
                        );
                    }
                    return response.text();
                })
                .then((markdownText) => {
                    setContent(markdownText);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err.message);
                    setLoading(false);
                });
        }
    }, [text, path]);

    useEffect(() => {
        setHasOverflow(false);
    }, [content]);

    // Measure if the rendered content overflows the available container height
    useLayoutEffect(() => {
        if (!contentRef.current || !content) return;

        const el = contentRef.current;
        if (el.clientHeight === 0) return;

        const isOverflowing = el.scrollHeight - el.clientHeight > 1;
        if (isOverflowing && !hasOverflow) {
            setHasOverflow(true);
        }
    }, [content, hasOverflow, resizeCount]);

    // Re-check overflow if fonts load asynchronously
    useEffect(() => {
        const contentWrapper = contentRef.current;
        if (document.fonts) {
            document.fonts.ready.then(() => {
                if (contentWrapper && contentWrapper.clientHeight > 0) {
                    const isOverflowing = contentWrapper.scrollHeight - contentWrapper.clientHeight > 1;
                    if (isOverflowing) {
                        setHasOverflow(true);
                    }
                }
            });
        }
    }, [content]);

    // Monitor container dimensions to re-evaluate overflow on resize
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (
                    width !== lastDimensionsRef.current.width ||
                    height !== lastDimensionsRef.current.height
                ) {
                    lastDimensionsRef.current = { width, height };
                    setHasOverflow(false);
                    setResizeCount((c) => c + 1);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="flex flex-col items-center h-full w-full overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
            <div ref={containerRef} className="w-7/10 flex-1 flex flex-col min-h-0 py-6 px-6 relative">
                {loading && (
                    <div className="text-center text-gray-600 my-auto">
                        Loading markdown...
                    </div>
                )}
                {error && (
                    <div className="text-center text-red-600 my-auto">
                        Error: {error}
                    </div>
                )}
                {!loading && !error && hasOverflow && (
                    <div className="text-center text-red-600 my-auto">
                        Error: Content overflows vertically
                    </div>
                )}
                {!loading && !error && !hasOverflow && !content && (
                    <div className="text-center text-gray-500 my-auto">
                        No content provided
                    </div>
                )}
                {!loading && !error && !hasOverflow && content && (
                    <div ref={contentRef} className="flex-1 overflow-hidden">
                        <MarkdownWrapper>{content}</MarkdownWrapper>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaticPage;
