import MarkdownWrapper from "@/components/markdown/MarkdownWrapper";
import PageLoading from "@/components/layout/PageLoading";
import type { StaticPageParameters } from "@/types/page";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const StaticPage: React.FC<StaticPageParameters & { compact?: boolean }> = ({ text, path, compact = false }) => {
    const [loaded, setLoaded] = useState<{ path: string; content: string; error: string | null } | null>(null);
    const loadedDocument = loaded?.path === path ? loaded : null;
    const content = text || loadedDocument?.content || "";
    const loading = !text && Boolean(path) && !loadedDocument;
    const error = text ? null : loadedDocument?.error ?? null;

    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState<boolean>(false);
    const [resizeCount, setResizeCount] = useState<number>(0);
    const lastDimensionsRef = useRef<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        setHasOverflow(false);
        if (!text && path) {
            const controller = new AbortController();
            setLoaded(null);
            fetch(path, { signal: controller.signal })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to load markdown file: ${response.statusText}`,
                        );
                    }
                    return response.text();
                })
                .then((markdownText) => {
                    if (controller.signal.aborted) return;
                    setLoaded({ path, content: markdownText, error: null });
                })
                .catch((err) => {
                    if (controller.signal.aborted) return;
                    setLoaded({ path, content: "", error: err instanceof Error ? err.message : "Could not load this page." });
                });
            return () => controller.abort();
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

    if (compact) {
        return (
            <div className="w-full shrink-0 px-4 py-2">
                {loading ? <div className="h-24"><PageLoading label="Loading page…" /></div> : <div className="mx-auto max-w-5xl [&_h1]:!my-0 [&_h1]:!text-2xl [&_p]:!mb-0 [&_p]:!text-sm [&_p]:!leading-snug [&_div]:!p-0">
                    {error ? <p role="alert" className="text-center text-red-600">Error: {error}</p> : <MarkdownWrapper>{content}</MarkdownWrapper>}
                </div>}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center h-full w-full overflow-hidden bg-page">
            <div ref={containerRef} className="w-7/10 flex-1 flex flex-col min-h-0 py-6 px-6 relative">
                {loading && (
                    <PageLoading label="Loading page…" />
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
