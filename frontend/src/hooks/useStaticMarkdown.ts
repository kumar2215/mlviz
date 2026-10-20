import { useEffect, useState } from "react";
import type { StaticMarkdownDocument, StaticPageParameters } from "@/types/page";

export default function useStaticMarkdown(source?: StaticPageParameters): StaticMarkdownDocument {
    const text = source?.text ?? "";
    const path = source?.path ?? "";
    const [loaded, setLoaded] = useState<{ path: string; content: string; error: string | null } | null>(null);
    const loadedDocument = loaded?.path === path ? loaded : null;

    useEffect(() => {
        if (text || !path) return;

        const controller = new AbortController();
        setLoaded(null);
        fetch(path, { signal: controller.signal })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load markdown file: ${response.statusText}`);
                }
                return response.text();
            })
            .then(content => {
                if (!controller.signal.aborted) setLoaded({ path, content, error: null });
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    setLoaded({ path, content: "", error: error instanceof Error ? error.message : "Could not load this page." });
                }
            });
        return () => controller.abort();
    }, [text, path]);

    return {
        content: text || loadedDocument?.content || "",
        loading: !text && Boolean(path) && !loadedDocument,
        error: text ? null : loadedDocument?.error ?? null,
    };
}
