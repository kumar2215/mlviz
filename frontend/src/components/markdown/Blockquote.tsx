import { NotepadText } from "lucide-react";
import { type ExtraProps } from "react-markdown";

export type BlockquoteProps = React.ComponentProps<"blockquote"> & ExtraProps;

type SupportedColour =
    | "red"
    | "orange"
    | "amber"
    | "yellow"
    | "lime"
    | "green"
    | "emerald"
    | "teal"
    | "cyan"
    | "sky"
    | "blue"
    | "indigo"
    | "violet"
    | "purple"
    | "fuchsia"
    | "pink"
    | "rose";

interface CalloutStyle {
    icon: React.ReactNode;
    colour: SupportedColour;
}

const feedbackClasses = {
    info: { border: "border-info-border", headerBg: "bg-info-strong text-on-info", bodyBg: "bg-info text-info-foreground" },
    success: { border: "border-success-border", headerBg: "bg-success-strong text-on-success", bodyBg: "bg-success text-success-foreground" },
    warning: { border: "border-warning-border", headerBg: "bg-warning-strong text-on-warning", bodyBg: "bg-warning text-warning-foreground" },
    danger: { border: "border-danger-border", headerBg: "bg-danger-strong text-on-danger", bodyBg: "bg-danger text-danger-foreground" },
};
const colourClasses: Record<SupportedColour, typeof feedbackClasses.info> = {
    red: feedbackClasses.danger, rose: feedbackClasses.danger,
    orange: feedbackClasses.warning, amber: feedbackClasses.warning, yellow: feedbackClasses.warning,
    lime: feedbackClasses.success, green: feedbackClasses.success, emerald: feedbackClasses.success, teal: feedbackClasses.success,
    cyan: feedbackClasses.info, sky: feedbackClasses.info, blue: feedbackClasses.info,
    indigo: feedbackClasses.info, violet: feedbackClasses.info, purple: feedbackClasses.info, fuchsia: feedbackClasses.info, pink: feedbackClasses.info,
};

const calloutStyles: Record<string, CalloutStyle> = {
    abstract: { icon: <NotepadText />, colour: "emerald" },
};

function hastToText(node: any): string {
    if (!node) return "";
    if (node.type === "text") return node.value ?? "";
    if (node.children) return node.children.map(hastToText).join("");
    return "";
}

// ── Plain blockquote ──────────────────────────────────────────────────────────

const PlainBlockquote: React.FC<{
    subtitle: string | null;
    body: string | null;
    calloutStyle?: CalloutStyle | null;
}> = ({ subtitle, body, calloutStyle }) => {
    if (!calloutStyle) {
        return (
            <blockquote className="border-2 border-border pl-4 my-4 text-[calc(0.625rem+0.5vw)] leading-relaxed">
                {subtitle && (
                    <p className="font-semibold text-foreground mb-1">
                        {subtitle}
                    </p>
                )}
                {body && <p className="italic text-muted-foreground">{body}</p>}
            </blockquote>
        );
    }

    const cls = colourClasses[calloutStyle.colour];

    return (
        <blockquote
            className={`my-4 rounded-xl overflow-hidden text-[calc(0.625rem+0.5vw)] leading-relaxed border-2 ${cls.border}`}
        >
            <div
                className={`flex items-center gap-2 font-semibold px-4 py-2 ${cls.headerBg}`}
            >
                {calloutStyle.icon && (
                    <span className="flex-none [&>svg]:w-4 [&>svg]:h-4 [&>svg]:block">
                        {calloutStyle.icon}
                    </span>
                )}
                {subtitle && <span className="leading-none">{subtitle}</span>}
            </div>
            {body && (
                <p className={`px-4 py-2 italic ${cls.bodyBg}`}>
                    {body}
                </p>
            )}
        </blockquote>
    );
};

// ── [!quote] / [!cite] — serif big-quote style ───────────────────────────────

const SerifQuote: React.FC<{
    subtitle: string | null;
    body: string | null;
    attribution: string | null;
}> = ({ subtitle, body, attribution }) => (
    <div className="relative my-6 px-8 py-4 font-serif">
        <span
            className="absolute top-0 left-0 text-7xl leading-none text-muted-foreground select-none"
            aria-hidden
        >
            &ldquo;
        </span>
        <div className="pl-2">
            {subtitle && (
                <p className="font-semibold text-foreground text-[calc(0.7rem+0.5vw)] mb-1">
                    {subtitle}
                </p>
            )}
            {body && (
                <p className="italic text-text-secondary text-[calc(0.7rem+0.5vw)] leading-relaxed mb-2">
                    {body}
                </p>
            )}
            {attribution && (
                <p className="text-sm font-semibold text-muted-foreground not-italic">
                    — {attribution}
                </p>
            )}
        </div>
        <span
            className="absolute bottom-0 right-2 text-7xl leading-none text-muted-foreground select-none"
            aria-hidden
        >
            &rdquo;
        </span>
    </div>
);

// ── Shared line splitter ──────────────────────────────────────────────────────

function splitLines(text: string): {
    subtitle: string | null;
    body: string | null;
} {
    const lines = text
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length === 0) return { subtitle: null, body: null };
    if (lines.length === 1) return { subtitle: null, body: lines[0] };
    return { subtitle: lines[0], body: lines.slice(1).join(" ") };
}

// ── Main export ───────────────────────────────────────────────────────────────

export const Blockquote: React.FC<BlockquoteProps> = ({ node }) => {
    const firstPara = node?.children?.find(
        (c: any) => c.type === "element" && c.tagName === "p",
    );
    const rawText = firstPara ? hastToText(firstPara) : "";

    const match = rawText.match(/^\[!([a-zA-Z]+)\]-?\s*([\s\S]*)/);

    if (!match) {
        const { subtitle, body } = splitLines(rawText);
        return (
            <PlainBlockquote
                subtitle={subtitle}
                body={body}
            />
        );
    }

    const typeKey = match[1].toLowerCase();
    const afterMarker = match[2];

    const nlIdx = afterMarker.indexOf("\n");
    const sameLine = (
        nlIdx === -1 ? afterMarker : afterMarker.slice(0, nlIdx)
    ).trim();
    const rest = nlIdx !== -1 ? afterMarker.slice(nlIdx + 1).trim() : "";

    if (typeKey === "quote" || typeKey === "cite") {
        const attribution = sameLine || null;
        const { subtitle, body } = splitLines(rest);
        return (
            <SerifQuote
                subtitle={subtitle}
                body={body}
                attribution={attribution}
            />
        );
    }

    const { subtitle, body } = splitLines(
        [sameLine, rest].filter(Boolean).join("\n"),
    );
    const calloutStyle = calloutStyles[typeKey] ?? null;
    return (
        <PlainBlockquote
            subtitle={subtitle}
            body={body}
            calloutStyle={calloutStyle}
        />
    );
};
