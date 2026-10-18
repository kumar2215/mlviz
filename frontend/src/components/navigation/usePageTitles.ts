import { useEffect, useMemo, useState } from "react";
import type { PageUnion } from "@/types/page";
import { fallbackPageTitle, markdownTitle } from "./pathwayModel";

const titleRequests = new Map<string, Promise<string | null>>();

function titleFor(page: PageUnion): Promise<string | null> {
    const reading = page.page_type === "static" ? page : page.page_type === "mixed" ? page.static_page : null;
    if (!reading) return Promise.resolve(null);
    if (reading.text) return Promise.resolve(markdownTitle(reading.text));
    if (!reading.path) return Promise.resolve(null);
    const path = /^(https?:)?\//.test(reading.path) ? reading.path : `${import.meta.env.BASE_URL}${reading.path}`;
    if (!titleRequests.has(path)) {
        titleRequests.set(path, fetch(path).then(response => response.ok ? response.text() : "").then(markdownTitle).catch(() => null));
    }
    return titleRequests.get(path)!;
}

export default function usePageTitles(pages: PageUnion[]): string[] {
    const fallback = useMemo(() => pages.map(fallbackPageTitle), [pages]);
    const [resolved, setResolved] = useState<{ pages: PageUnion[]; titles: string[] } | null>(null);
    useEffect(() => {
        let cancelled = false;
        Promise.all(pages.map(async (page, index) => await titleFor(page) || fallbackPageTitle(page, index))).then(titles => {
            if (!cancelled) setResolved({ pages, titles });
        });
        return () => { cancelled = true; };
    }, [pages]);
    return resolved?.pages === pages ? resolved.titles : fallback;
}
