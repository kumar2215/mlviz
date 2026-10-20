import type { ReactNode } from "react";
import MarkdownWrapper from "@/components/markdown/MarkdownWrapper";
import type { ActivityNarrationProps } from "@/types/page";

export default function ActivityIntroduction({ narration, children, className = "" }: ActivityNarrationProps & { children: ReactNode; className?: string }) {
    if (!narration) return <>{children}</>;

    if (narration.loading) {
        return <p role="status" className={`shrink-0 text-sm text-slate-600 ${className}`}>Loading narration…</p>;
    }

    if (narration.error) {
        return <div className={`min-w-0 shrink-0 ${className}`}>
            {children}
            <p role="alert" className="shrink-0 text-sm text-red-600">Could not load story narration: {narration.error}</p>
        </div>;
    }

    if (!narration.content.trim()) return <>{children}</>;

    return <div aria-label="Story introduction" tabIndex={0} className={`max-h-[30vh] min-w-0 shrink-0 overflow-y-auto break-words ${className}`}>
        <MarkdownWrapper variant="activity">{narration.content}</MarkdownWrapper>
    </div>;
}
