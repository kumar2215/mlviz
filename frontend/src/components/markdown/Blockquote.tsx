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

const colourClasses: Record<
    SupportedColour,
    {
        border: string;
        headerBg: string;
        bodyBg: string;
    }
> = {
    red: {
        border: "border-rose-600",
        headerBg: "bg-gradient-to-r from-rose-600 to-red-600",
        bodyBg: "bg-gradient-to-r from-rose-50 to-red-50",
    },
    orange: {
        border: "border-red-600",
        headerBg: "bg-gradient-to-r from-red-600 to-orange-600",
        bodyBg: "bg-gradient-to-r from-red-50 to-orange-50",
    },
    amber: {
        border: "border-orange-600",
        headerBg: "bg-gradient-to-r from-orange-600 to-amber-600",
        bodyBg: "bg-gradient-to-r from-orange-50 to-amber-50",
    },
    yellow: {
        border: "border-amber-600",
        headerBg: "bg-gradient-to-r from-amber-600 to-yellow-600",
        bodyBg: "bg-gradient-to-r from-amber-50 to-yellow-50",
    },
    lime: {
        border: "border-yellow-600",
        headerBg: "bg-gradient-to-r from-yellow-600 to-lime-600",
        bodyBg: "bg-gradient-to-r from-yellow-50 to-lime-50",
    },
    green: {
        border: "border-lime-600",
        headerBg: "bg-gradient-to-r from-lime-600 to-green-600",
        bodyBg: "bg-gradient-to-r from-lime-50 to-green-50",
    },
    emerald: {
        border: "border-green-600",
        headerBg: "bg-gradient-to-r from-green-600 to-emerald-600",
        bodyBg: "bg-gradient-to-r from-green-50 to-emerald-50",
    },
    teal: {
        border: "border-emerald-600",
        headerBg: "bg-gradient-to-r from-emerald-600 to-teal-600",
        bodyBg: "bg-gradient-to-r from-emerald-50 to-teal-50",
    },
    cyan: {
        border: "border-teal-600",
        headerBg: "bg-gradient-to-r from-teal-600 to-cyan-600",
        bodyBg: "bg-gradient-to-r from-teal-50 to-cyan-50",
    },
    sky: {
        border: "border-cyan-600",
        headerBg: "bg-gradient-to-r from-cyan-600 to-sky-600",
        bodyBg: "bg-gradient-to-r from-cyan-50 to-sky-50",
    },
    blue: {
        border: "border-sky-600",
        headerBg: "bg-gradient-to-r from-sky-600 to-blue-600",
        bodyBg: "bg-gradient-to-r from-sky-50 to-blue-50",
    },
    indigo: {
        border: "border-blue-600",
        headerBg: "bg-gradient-to-r from-blue-600 to-indigo-600",
        bodyBg: "bg-gradient-to-r from-blue-50 to-indigo-50",
    },
    violet: {
        border: "border-indigo-600",
        headerBg: "bg-gradient-to-r from-indigo-600 to-violet-600",
        bodyBg: "bg-gradient-to-r from-indigo-50 to-violet-50",
    },
    purple: {
        border: "border-violet-600",
        headerBg: "bg-gradient-to-r from-violet-600 to-purple-600",
        bodyBg: "bg-gradient-to-r from-violet-50 to-purple-50",
    },
    fuchsia: {
        border: "border-purple-600",
        headerBg: "bg-gradient-to-r from-purple-600 to-fuchsia-600",
        bodyBg: "bg-gradient-to-r from-purple-50 to-fuchsia-50",
    },
    pink: {
        border: "border-fuchsia-600",
        headerBg: "bg-gradient-to-r from-fuchsia-600 to-pink-600",
        bodyBg: "bg-gradient-to-r from-fuchsia-50 to-pink-50",
    },
    rose: {
        border: "border-pink-600",
        headerBg: "bg-gradient-to-r from-pink-600 to-rose-600",
        bodyBg: "bg-gradient-to-r from-pink-50 to-rose-50",
    },
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
            <blockquote className="border-2 border-gray-300 pl-4 my-4 text-[calc(0.625rem+0.5vw)] leading-relaxed">
                {subtitle && (
                    <p className="font-semibold text-gray-700 mb-1">
                        {subtitle}
                    </p>
                )}
                {body && <p className="italic text-gray-500">{body}</p>}
            </blockquote>
        );
    }

    const cls = colourClasses[calloutStyle.colour];

    return (
        <blockquote
            className={`my-4 rounded-xl overflow-hidden text-[calc(0.625rem+0.5vw)] leading-relaxed border-2 ${cls.border}`}
        >
            <div
                className={`flex items-center gap-2 font-semibold px-4 py-2 text-white ${cls.headerBg}`}
            >
                {calloutStyle.icon && (
                    <span className="flex-none [&>svg]:w-4 [&>svg]:h-4 [&>svg]:block">
                        {calloutStyle.icon}
                    </span>
                )}
                {subtitle && <span className="leading-none">{subtitle}</span>}
            </div>
            {body && (
                <p className={`px-4 py-2 italic text-gray-700 ${cls.bodyBg}`}>
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
            className="absolute top-0 left-0 text-7xl leading-none text-gray-300 select-none"
            aria-hidden
        >
            &ldquo;
        </span>
        <div className="pl-2">
            {subtitle && (
                <p className="font-semibold text-gray-700 text-[calc(0.7rem+0.5vw)] mb-1">
                    {subtitle}
                </p>
            )}
            {body && (
                <p className="italic text-gray-600 text-[calc(0.7rem+0.5vw)] leading-relaxed mb-2">
                    {body}
                </p>
            )}
            {attribution && (
                <p className="text-sm font-semibold text-gray-500 not-italic">
                    — {attribution}
                </p>
            )}
        </div>
        <span
            className="absolute bottom-0 right-2 text-7xl leading-none text-gray-300 select-none"
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
