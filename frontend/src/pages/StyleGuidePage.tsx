import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { categoricalPalettes, chartColors, continuousSchemes, mascotColors, pathwayColors, uiColors } from "@/theme/colors";
import { createContinuousColorScale, type ContinuousSchemeName } from "@/utils/colorUtils";
import { subpageArc } from "@/components/navigation/pathwayModel";

const notices = [
    { label: "Information", className: "border-info-border bg-info text-info-foreground" },
    { label: "Success ✓", className: "border-success-border bg-success text-success-foreground" },
    { label: "Warning !", className: "border-warning-border bg-warning text-warning-foreground" },
    { label: "Error !", className: "border-danger-border bg-danger text-danger-foreground" },
    { label: "Reward · +15 XP", className: "border-reward-border bg-reward text-reward-foreground" },
];
const groups = { "Interface roles": uiColors, Pathway: pathwayColors, Mascot: mascotColors, "Chart roles": chartColors };

function PathwayExample() {
    const nodes = [
        { x: 50, y: 65, fill: pathwayColors.visited, stroke: pathwayColors.outline, label: "Visited" },
        { x: 150, y: 115, fill: pathwayColors.current, stroke: pathwayColors.current, label: "Current" },
        { x: 250, y: 65, fill: pathwayColors.available, stroke: pathwayColors.outline, label: "Available" },
        { x: 350, y: 115, fill: pathwayColors.locked, stroke: pathwayColors.lockedOutline, label: "Locked 🔒" },
    ];
    return <svg viewBox="0 0 410 180" className="max-h-60 w-full" role="img" aria-label="Pathway examples: visited, current with subpages, available, and locked">
        <path d="M 70 75 Q 105 110 126 112" stroke={pathwayColors.edgeTraversed} strokeWidth="2" fill="none" />
        <path d="M 173 105 Q 210 65 226 65" stroke={pathwayColors.edgeCurrent} strokeWidth="2" fill="none" />
        <path d="M 273 75 Q 310 115 326 115" stroke={pathwayColors.edgeLocked} strokeWidth="2" strokeDasharray="4 5" fill="none" />
        {nodes.map((node, index) => <g key={node.label}>
            <circle cx={node.x} cy={node.y} r="22" fill={node.fill} stroke={node.stroke} strokeWidth="2" strokeDasharray={index === 3 ? "4 4" : undefined} />
            <text x={node.x} y={node.y + 5} textAnchor="middle" fill={index === 1 ? pathwayColors.onCurrent : uiColors.foreground}>{index + 1}</text>
            <text x={node.x} y={node.y + 45} textAnchor="middle" className="text-xs" fill={uiColors.textSecondary}>{node.label}</text>
        </g>)}
        <g transform="translate(110 75)">{[0, 1, 2].map(index => <path key={index} d={subpageArc(index, 3)} fill="none" stroke={[pathwayColors.segmentCompleted, pathwayColors.segmentCurrent, pathwayColors.segmentNext][index]} strokeWidth="4" strokeLinecap="round" />)}</g>
        <image href={`${import.meta.env.BASE_URL}images/soccat-marker.svg`} x="177" y="97" width="32" height="32" />
    </svg>;
}

/** Development reference only: no account, task or pathway actions are dispatched. */
export default function StyleGuidePage() {
    const scales = Object.entries(continuousSchemes).filter(([, scheme], index, entries) => entries.findIndex(entry => entry[1] === scheme) === index).map(([name, scheme]) => ({ name, scheme, color: createContinuousColorScale([0, 1], name as ContinuousSchemeName) }));
    return <main className="h-dvh overflow-auto bg-page text-foreground">
        <div className="mx-auto max-w-6xl space-y-8 p-6 pb-16">
            <header className="space-y-2"><Link className="text-primary underline" to="/">← Back to MLViz</Link><h1 className="text-3xl font-bold">MLViz colour style guide</h1><p className="text-text-secondary">Development reference · shared palette, component states and chart meanings</p></header>
            <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
                <h2 className="text-xl font-semibold">Actions, fields and tooltips</h2>
                <div className="flex flex-wrap gap-3"><Button>Primary</Button><Button className="bg-primary-hover">Hover</Button><Button className="bg-primary-pressed">Pressed</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button><Button variant="destructive">Delete</Button><Button disabled>Disabled</Button><Tooltip><TooltipTrigger asChild><Button variant="outline">Hover or focus for tooltip</Button></TooltipTrigger><TooltipContent>White surface, dark text, matching arrow</TooltipContent></Tooltip></div>
                <p className="text-sm text-text-secondary">Use Tab to inspect the focus ring. Focus uses a blue ring and a surface-coloured offset.</p>
                <div className="flex flex-wrap gap-4"><label className="text-sm">Example field<input aria-label="Example field" className="mt-1 block rounded-md border border-control-border bg-surface p-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" placeholder="Example text" /></label><label className="text-sm">Disabled field<input disabled className="mt-1 block rounded-md border border-disabled-border bg-disabled p-2 text-disabled-foreground" value="Disabled" readOnly /></label></div>
                <div className="flex flex-wrap gap-3"><Button className="border border-selection-border bg-selection text-selection-foreground hover:bg-info-border">Selected option ✓</Button><Button variant="outline">Unselected option</Button></div>
            </section>
            <section className="space-y-3 rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">Feedback and XP</h2><div className="grid gap-3 sm:grid-cols-2">{notices.map(notice => <div key={notice.label} className={`rounded-lg border p-3 ${notice.className}`}>{notice.label}</div>)}</div><div className="rounded-lg border border-reward-border bg-reward p-4 text-reward-foreground"><p className="font-semibold">Level 4 · 375 XP</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-reward-track"><div className="h-full w-3/4 rounded-full reward-meter" /></div></div></section>
            <section className="rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">Pathway states</h2><PathwayExample /><p className="text-sm text-text-secondary">Current segments are dark; completed and next segments are lighter. Dashed lines and locks reinforce unavailable states. The mascot identifies the current position.</p></section>
            <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">Chart colours</h2><div className="flex flex-wrap gap-4">{["current", "proposal", "fitted", "train", "test", "error"].map(role => <span key={role} className="flex items-center gap-2 text-sm"><span className="h-1 w-8" style={{ backgroundColor: chartColors[role as keyof typeof chartColors] }} />{role}</span>)}</div>{Object.entries(categoricalPalettes).map(([name, colors]) => <div key={name}><h3 className="text-sm font-semibold">{name}</h3><div className="mt-1 flex h-8 overflow-hidden rounded">{colors.map((color, index) => <span key={`${color}-${index}`} title={`${index + 1}: ${color}`} className="flex-1" style={{ backgroundColor: color }} />)}</div></div>)}{scales.map(scale => <div key={scale.name}><h3 className="text-sm font-semibold">{scale.scheme}</h3><div className="mt-1 flex h-8 overflow-hidden rounded">{Array.from({ length: 32 }, (_, index) => <span key={index} className="flex-1" style={{ backgroundColor: scale.color(index / 31) }} />)}</div></div>)}</section>
            {Object.entries(groups).map(([name, colors]) => <section key={name} className="rounded-xl border border-border bg-surface p-5"><h2 className="mb-4 text-xl font-semibold">{name}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(colors).map(([role, color]) => <div key={role} className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-2"><span className="size-10 shrink-0 rounded border border-border" style={{ backgroundColor: color }} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{role}</p><code className="text-xs text-text-secondary">{color}</code></div></div>)}</div></section>)}
        </div>
    </main>;
}
