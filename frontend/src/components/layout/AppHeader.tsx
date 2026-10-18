import { BookOpen, FlaskConical, LogOut, Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePreviewSession } from "@/store/usePreviewSession";

export default function AppHeader() {
    const { pathname } = useLocation();
    const storyMode = pathname === "/stories" || pathname.startsWith("/story/");
    const signedIn = usePreviewSession(state => state.signedIn);
    const openDialog = usePreviewSession(state => state.openDialog);
    const signOut = usePreviewSession(state => state.signOut);

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
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {signedIn ? (
                    <>
                        <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800"><Zap className="size-4 fill-sky-200 text-sky-600" />1,250 XP</span>
                        <span aria-label="Demo Learner avatar" className="flex size-9 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">DL</span>
                        <div className="text-sm leading-tight"><span className="block font-semibold text-slate-800">Demo Learner</span><span className="text-xs text-slate-500">Preview account</span></div>
                        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="size-4" /><span>Sign out</span></Button>
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
