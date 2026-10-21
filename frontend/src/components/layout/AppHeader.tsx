import { BookOpen, FlaskConical, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/store/useAuthSession";
import { LearnerSummary } from "./LearningProgress";

export default function AppHeader() {
    const { pathname } = useLocation();
    const storyMode = pathname === "/stories" || pathname.startsWith("/story/");
    const user = useAuthSession(state => state.user);
    const status = useAuthSession(state => state.status);
    const pending = useAuthSession(state => state.pending);
    const profileStatus = useAuthSession(state => state.profileStatus);
    const error = useAuthSession(state => state.error);
    const openDialog = useAuthSession(state => state.openDialog);
    const signOut = useAuthSession(state => state.signOut);
    const name = user?.displayName || user?.email || "Learner";
    const initials = name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();

    return (
        <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-blue-100 bg-white/95 px-5 py-3 lg:px-8">
            <Link to="/" data-brand-link className="rounded-lg text-3xl font-bold tracking-tighter text-sky-500 outline-offset-4 focus-visible:outline-2 focus-visible:outline-blue-600" aria-label="mlviz home">
                ml<span className="text-gray-500">viz</span>
            </Link>
            <nav aria-label="Learning mode" className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[
                    { to: "/", label: "Visualisations", Icon: FlaskConical, active: !storyMode },
                    { to: "/stories", label: "Stories", Icon: BookOpen, active: storyMode },
                ].map(({ to, label, Icon, active }) => (
                    <Link key={to} to={to} aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-blue-700"}`}>
                        <Icon className="size-4" />{label}
                    </Link>
                ))}
            </nav>
            <LearnerSummary compact />
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {status === "loading" ? <span role="status" className="text-sm text-slate-500">Loading account…</span> : user ? (
                    <>
                        <Button variant="ghost" disabled={pending} onClick={() => openDialog("account")} aria-label={`Account settings for ${name}`}>
                            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">{initials}</span>
                            <span className="max-w-48 truncate text-sm">{name}</span>
                            {(!user.emailVerified || profileStatus === "error") && <span className="text-xs text-amber-700">Check account</span>}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={pending} onClick={() => void signOut()}><LogOut className="size-4" /><span>Sign out</span></Button>
                        {error && <span role="alert" className="max-w-xs text-xs text-red-700">{error}</span>}
                    </>
                ) : (
                    <>
                        <Button variant="ghost" onClick={() => openDialog("sign-in")}>Sign in</Button>
                        <Button onClick={() => openDialog("sign-up")}>Sign up</Button>
                    </>
                )}
            </div>
        </header>
    );
}
