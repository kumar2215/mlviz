import { Dialog } from "radix-ui";
import { BookOpen, ShieldCheck, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSession } from "@/store/useAuthSession";
import RegistrationPasswordField from "./RegistrationPasswordField";
import { LearnerSummary, LearningSaveStatus } from "./LearningProgress";

export default function AccountDialogs() {
    const { pathname } = useLocation();
    const account = useAuthSession(state => state);
    const { dialog, user, status, pending, openDialog, enterStories } = account;
    const opener = useRef<HTMLElement | null>(null);
    const id = useId();
    const [emailDraft, setEmailDraft] = useState("");
    const isPrompt = dialog === "story-prompt";
    const isSignUp = dialog === "sign-up";
    const isReset = dialog === "reset-password";
    const isAccount = dialog === "account";
    const disabled = pending || status !== "ready";

    useEffect(() => {
        if (pathname === "/stories" || pathname.startsWith("/story/")) enterStories();
    }, [pathname, status, user, enterStories]);

    return (
        <Dialog.Root open={dialog !== null} onOpenChange={open => { if (!open) openDialog(null); }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
                <Dialog.Content
                    onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
                    onCloseAutoFocus={event => { event.preventDefault(); (opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>("[data-brand-link]"))?.focus(); }}
                    className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-blue-100 bg-white p-7 shadow-2xl">
                    <Dialog.Close asChild><Button variant="ghost" size="icon" disabled={pending} aria-label="Close account dialog" className="absolute right-3 top-3"><X className="size-4" /></Button></Dialog.Close>
                    <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{isPrompt ? <BookOpen /> : <ShieldCheck />}</div>
                    <Dialog.Title className="pr-4 text-2xl font-bold tracking-tight text-slate-900">{isPrompt ? "Make yourself at home" : isAccount ? "Your account" : isReset ? "Reset your password" : isSignUp ? "Start your learning journey" : "Welcome back"}</Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-relaxed text-slate-600">
                        {isPrompt ? "Create a learner profile, sign in, or keep exploring as a guest." : isAccount ? "Manage your sign-in and email verification." : isReset ? "Enter your email to request a password reset link." : isSignUp ? "Create your account with Google or your email address." : "Sign in with Google or your email address."}
                    </Dialog.Description>
                    {status === "loading" && <p role="status" className="mt-4 text-sm text-slate-600">Loading account…</p>}
                    {status === "unavailable" && <p role="alert" className="mt-4 text-sm text-red-700">{account.configurationError || account.error || "Account services are unavailable. You can continue exploring as a guest."}</p>}
                    {account.error && status !== "unavailable" && <p role="alert" className="mt-4 text-sm text-red-700">{account.error}</p>}
                    {account.notice && <p role="status" className="mt-4 text-sm text-blue-800">{account.notice}</p>}
                    {isPrompt ? (
                        <div className="mt-5 space-y-3">
                            <Button className="w-full" onClick={() => openDialog("sign-up")}>Create account</Button>
                            <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => openDialog("sign-in")}>Sign in</Button><Button variant="ghost" onClick={() => openDialog(null)}>Continue as guest</Button></div>
                        </div>
                    ) : isAccount ? (
                        <div className="mt-5 space-y-4">
                            <LearnerSummary />
                            {user && <>
                                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="break-words font-semibold">{user.displayName || "Learner"}</p><p className="break-all">{user.email}</p><p className="mt-2">{user.emailVerified ? "Email verified" : "Email verification pending"}</p></div>
                                {!user.emailVerified && <div className="space-y-2"><Button disabled={disabled} variant="outline" className="w-full" onClick={() => void account.sendVerification()}>Resend verification email</Button><Button disabled={disabled} variant="ghost" className="w-full" onClick={() => void account.checkVerification()}>I've verified my email — check again</Button></div>}
                                {account.profileStatus === "saving" && <p role="status" className="text-sm text-slate-500">Saving your profile…</p>}
                                {account.profileStatus === "error" && <div className="space-y-2"><p role="alert" className="text-sm text-amber-800">You're signed in, but your profile couldn't be saved. Check your connection and try again. If this persists, the app's database rules may need to be configured.</p><Button variant="outline" disabled={disabled} onClick={() => void account.retryProfile()}>Retry saving profile</Button></div>}
                                <Button disabled={disabled} variant="outline" className="w-full" onClick={() => void account.signOut()}>Sign out</Button>
                            </>}
                            {!user && <Button disabled={disabled} onClick={() => openDialog("sign-in")}>Sign in</Button>}
                        </div>
                    ) : (
                        <form key={dialog} className="mt-5 space-y-4" aria-busy={pending} onSubmit={event => {
                            event.preventDefault();
                            const data = new FormData(event.currentTarget);
                            const email = String(data.get("email") || "");
                            const password = String(data.get("password") || "");
                            if (isReset) void account.resetPassword(email);
                            else if (isSignUp) void account.signUp(String(data.get("name") || ""), email, password);
                            else void account.signIn(email, password);
                        }}>
                            <fieldset disabled={disabled} className="min-w-0 space-y-4">
                                {isSignUp && <div className="space-y-1.5"><label htmlFor={`${id}-name`} className="text-sm font-medium text-slate-700">Username</label><Input id={`${id}-name`} name="name" required maxLength={100} autoComplete="name" /></div>}
                                <div className="space-y-1.5"><label htmlFor={`${id}-email`} className="text-sm font-medium text-slate-700">Email</label><Input id={`${id}-email`} name="email" type="email" required placeholder="learner@example.com" defaultValue={emailDraft} onChange={event => setEmailDraft(event.target.value)} autoComplete={isReset ? "email" : "username"} /></div>
                                {isSignUp ? <RegistrationPasswordField id={`${id}-password`} enabled={status === "ready"} refreshKey={account.error} validatePassword={account.validatePassword} /> : !isReset && <div className="space-y-1.5"><label htmlFor={`${id}-password`} className="text-sm font-medium text-slate-700">Password</label><Input id={`${id}-password`} name="password" type="password" required autoComplete="current-password" /></div>}
                                <Button type="submit" className="w-full">{pending ? "Please wait…" : isReset ? "Send reset link" : isSignUp ? "Create account" : "Sign in"}</Button>
                                {!isReset && <Button type="button" variant="outline" className="w-full" onClick={() => void account.signInWithGoogle()}>Continue with Google</Button>}
                            </fieldset>
                            {account.passwordResetRequired && <Button type="button" disabled={pending} variant="outline" className="w-full" onClick={() => openDialog("reset-password")}>Reset password to continue</Button>}
                            <Button type="button" disabled={pending} variant="ghost" className="w-full" onClick={() => openDialog(isSignUp || isReset ? "sign-in" : "sign-up")}>{isSignUp || isReset ? "Back to sign in" : "New here? Sign up"}</Button>
                            {!isSignUp && !isReset && <Button type="button" disabled={pending} variant="ghost" className="w-full" onClick={() => openDialog("reset-password")}>Forgot password?</Button>}
                        </form>
                    )}
                    <LearningSaveStatus className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3" />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
