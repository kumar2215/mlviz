import { Dialog } from "radix-ui";
import { BookOpen, Cloud, Monitor, ShieldCheck, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreviewSession } from "@/store/usePreviewSession";

export default function AccountPreviewDialogs() {
    const { pathname } = useLocation();
    const dialog = usePreviewSession(state => state.dialog);
    const openDialog = usePreviewSession(state => state.openDialog);
    const enterStories = usePreviewSession(state => state.enterStories);
    const previewSignIn = usePreviewSession(state => state.previewSignIn);
    const opener = useRef<HTMLElement | null>(null);
    const id = useId();
    const isPrompt = dialog === "story-prompt";
    const isSignUp = dialog === "sign-up";

    useEffect(() => {
        if (pathname === "/stories" || pathname.startsWith("/story/")) enterStories();
    }, [pathname, enterStories]);

    return (
        <Dialog.Root open={dialog !== null} onOpenChange={open => { if (!open) openDialog(null); }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
                <Dialog.Content
                    onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
                    onCloseAutoFocus={event => { event.preventDefault(); (opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>("[data-brand-link]"))?.focus(); }}
                    className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-blue-100 bg-white p-7 shadow-2xl">
                    <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close account preview" className="absolute right-3 top-3"><X className="size-4" /></Button></Dialog.Close>
                    <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{isPrompt ? <BookOpen /> : <ShieldCheck />}</div>
                    <Dialog.Title className="pr-4 text-2xl font-bold tracking-tight text-slate-900">{isPrompt ? "Keep your discoveries" : isSignUp ? "Start your learning journey" : "Welcome back"}</Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-relaxed text-slate-600">
                        {isPrompt ? "An account will let you keep your story progress and XP across devices. You can also explore as a guest." : isSignUp ? "Preview how creating an account will look. Your stories, discoveries, and XP will have a home here." : "Preview your account layout and XP display."}
                    </Dialog.Description>
                    {isPrompt ? (
                        <div className="mt-5 space-y-4">
                            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                <p className="flex items-start gap-3"><Cloud className="mt-0.5 size-4 shrink-0 text-blue-600" /><span>With an account, progress will sync across your devices.</span></p>
                                <p className="flex items-start gap-3"><Monitor className="mt-0.5 size-4 shrink-0 text-blue-600" /><span>Guest XP will stay on this device and can be synced when you create an account.</span></p>
                            </div>
                            <Button className="w-full" onClick={() => openDialog("sign-up")}>Create account</Button>
                            <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => openDialog("sign-in")}>Sign in</Button><Button variant="ghost" onClick={() => openDialog(null)}>Continue as guest</Button></div>
                        </div>
                    ) : (
                        <form key={dialog} className="mt-5 space-y-4" autoComplete="off" onSubmit={event => { event.preventDefault(); previewSignIn(); }}>
                            {isSignUp && <div className="space-y-1.5"><label htmlFor={`${id}-name`} className="text-sm font-medium text-slate-700">Name</label><Input id={`${id}-name`} placeholder="Demo Learner" autoComplete="off" /></div>}
                            <div className="space-y-1.5"><label htmlFor={`${id}-email`} className="text-sm font-medium text-slate-700">Email</label><Input id={`${id}-email`} type="email" placeholder="learner@example.com" autoComplete="off" /></div>
                            <div className="space-y-1.5"><label htmlFor={`${id}-password`} className="text-sm font-medium text-slate-700">Password</label><Input id={`${id}-password`} type="password" placeholder="Preview only — no password needed" autoComplete="new-password" /></div>
                            <Button type="submit" className="w-full">Preview signed-in layout</Button>
                            <Button type="button" variant="ghost" className="w-full" onClick={() => openDialog(isSignUp ? "sign-in" : "sign-up")}>{isSignUp ? "Already have an account? Sign in" : "New here? Sign up"}</Button>
                        </form>
                    )}
                    <p className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900"><strong>UI preview only.</strong> Accounts, XP earning, device saving, and syncing are not connected yet. No details are submitted or stored. Sample XP resets when you refresh.</p>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
