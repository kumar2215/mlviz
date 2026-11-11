import { BookOpen, FlaskConical, Sparkles, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/store/useAuthSession";
import useLearningSummary from "@/hooks/useLearningSummary";
import { useProgress } from "@/store/useProgress";
import { headerXpDisplay } from "@/lib/xpMotion";

export default function AppHeader() {
    const { pathname } = useLocation();
    const storyMode = pathname === "/stories" || pathname.startsWith("/story/");
    const user = useAuthSession(state => state.user);
    const status = useAuthSession(state => state.status);
    const pending = useAuthSession(state => state.pending);
    const profileStatus = useAuthSession(state => state.profileStatus);
    const error = useAuthSession(state => state.error);
    const openDialog = useAuthSession(state => state.openDialog);
    const summary = useLearningSummary();
    const transfer = useProgress(state => state.xpTransfers[0]);
    const { xp, level, current, required } = headerXpDisplay(summary.xp, summary.required, transfer);
    const loading = status === "loading";
    const name = user ? user.displayName || user.email || "Learner" : "Guest";
    const initials = name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();

    return (
        <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-info-border bg-surface-translucent px-5 py-3 lg:px-8">
            <Link to="/" data-brand-link className="rounded-lg text-3xl font-bold tracking-tighter text-brand outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" aria-label="mlviz home">
                ml<span className="text-muted-foreground">viz</span>
            </Link>
            <nav aria-label="Learning mode" className="flex rounded-xl border border-border bg-surface-subtle p-1">
                {[
                    { to: "/", label: "Visualisations", Icon: FlaskConical, active: !storyMode },
                    { to: "/stories", label: "Stories", Icon: BookOpen, active: storyMode },
                ].map(({ to, label, Icon, active }) => (
                    <Link key={to} to={to} aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-text-secondary hover:bg-surface hover:text-selection-foreground"}`}>
                        <Icon className="size-4" />{label}
                    </Link>
                ))}
            </nav>
            <div className="ml-auto flex max-w-full flex-col items-end gap-2">
                <Button type="button" variant="ghost" disabled={pending || loading} aria-busy={loading}
                    onClick={() => openDialog(user ? "account" : "sign-in")}
                    aria-label={`${loading ? "Loading account" : user ? `Account settings for ${name}` : "Sign in or sign up"}. ${summary.xp} XP, Level ${summary.level}. ${summary.current} of ${summary.required} XP toward the next level.`}
                    className="h-auto min-w-56 max-w-full gap-3 rounded-xl border border-info-border bg-surface-subtle px-3 py-1.5 text-left text-foreground hover:bg-surface-tint">
                    <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${user ? "bg-primary text-primary-foreground" : "bg-selection text-selection-foreground"}`}>{user ? initials : <UserRound className="size-5" />}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center justify-between gap-3">
                            <span className="max-w-40 truncate text-sm font-semibold">{loading ? "Loading account…" : name}</span>
                            {!loading && !user && <span className="text-xs text-selection-foreground">Sign in / Sign up</span>}
                            {user && (!user.emailVerified || profileStatus === "error") && <span className="text-xs text-warning-foreground">Check account</span>}
                        </span>
                        <span className="flex items-center justify-between gap-3 text-xs text-reward-foreground"><span className="flex items-center gap-1 font-semibold"><Sparkles aria-hidden="true" className="size-3.5" />{xp} XP</span><span>Level {level}</span></span>
                        <span data-xp-meter aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-reward-track"><span data-xp-meter-fill className="block h-full rounded-full reward-meter" style={{ width: `${current / required * 100}%` }} /></span>
                    </span>
                </Button>
                {user && error && <span role="alert" className="max-w-xs text-xs text-danger-foreground">{error}</span>}
            </div>
        </header>
    );
}
