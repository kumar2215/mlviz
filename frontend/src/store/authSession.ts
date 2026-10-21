import { createStore } from "zustand/vanilla";
import type { PasswordValidationStatus } from "firebase/auth";
import { passwordRequirementError } from "../lib/passwordPolicy.ts";

export interface AccountUser {
    uid: string;
    displayName: string | null;
    email: string | null;
    emailVerified: boolean;
}

export interface AccountService {
    subscribe: (next: (user: AccountUser | null) => void, error: (error: unknown) => void) => () => void;
    signIn: (email: string, password: string) => Promise<AccountUser>;
    signUp: (name: string, email: string, password: string) => Promise<{ user: AccountUser; warning?: string }>;
    validatePassword: (password: string) => Promise<PasswordValidationStatus>;
    signInWithGoogle: () => Promise<AccountUser>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    sendVerification: () => Promise<void>;
    reloadUser: () => Promise<AccountUser | null>;
    syncProfile: (user: AccountUser) => Promise<void>;
}

export type AccountDialog = "sign-in" | "sign-up" | "story-prompt" | "reset-password" | "account" | null;
export type AuthStatus = "loading" | "ready" | "unavailable";

export function accountError(error: unknown): string {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    switch (code) {
        case "auth/invalid-credential": case "auth/user-not-found": case "auth/wrong-password":
        case "auth/email-already-in-use": return "We couldn't complete this request. Check your details, try signing in, or reset your password.";
        case "auth/invalid-email": return "Enter a valid email address.";
        case "auth/weak-password": case "auth/password-does-not-meet-requirements": return "Your password doesn't meet the current requirements. Review the password checklist and try again.";
        case "auth/popup-closed-by-user": case "auth/cancelled-popup-request": return "Google sign-in was cancelled. You can try again.";
        case "auth/popup-blocked": return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
        case "auth/unauthorized-domain": return "This site's hostname must be added to Firebase Authentication's authorized domains.";
        case "auth/operation-not-allowed": return "This sign-in method has not been enabled for this app.";
        case "auth/account-exists-with-different-credential": return "Sign in using your existing account's original sign-in method.";
        case "auth/too-many-requests": return "Too many requests. Please wait before trying again.";
        case "auth/network-request-failed": return "Check your internet connection and try again.";
        default: return "Account services couldn't complete the request. Please try again.";
    }
}

interface AuthSession {
    user: AccountUser | null;
    status: AuthStatus;
    configurationError: string | null;
    pending: boolean;
    error: string | null;
    notice: string | null;
    passwordResetRequired: boolean;
    profileStatus: "idle" | "saving" | "saved" | "error";
    dialog: AccountDialog;
    storyPromptShown: boolean;
    start: () => () => void;
    openDialog: (dialog: AccountDialog) => void;
    enterStories: () => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (name: string, email: string, password: string) => Promise<void>;
    validatePassword: (password: string) => Promise<PasswordValidationStatus>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    sendVerification: () => Promise<void>;
    checkVerification: () => Promise<void>;
    retryProfile: () => Promise<void>;
}

export function createAuthSession(service: AccountService | null, configurationError: string | null = null) {
    let profileRequest = 0;
    let identityVersion = 0;
    let operationVersion = 0;
    return createStore<AuthSession>((set, get) => {
        function acceptUser(user: AccountUser | null) {
            const changed = user?.uid !== get().user?.uid;
            if (changed) { identityVersion++; profileRequest++; }
            set({ user, status: "ready", ...(changed ? { profileStatus: "idle" as const } : {}) });
        }

        async function syncProfile() {
            const user = get().user;
            if (!service || !user) return;
            const request = ++profileRequest;
            set({ profileStatus: "saving" });
            try {
                await service.syncProfile(user);
                if (request === profileRequest) set({ profileStatus: "saved" });
            } catch {
                if (request === profileRequest) set({ profileStatus: "error" });
            }
        }

        async function run(action: (isCurrent: () => boolean) => Promise<void>) {
            if (!service || get().pending || get().status !== "ready") return;
            const operation = ++operationVersion;
            set({ pending: true, error: null, notice: null, passwordResetRequired: false });
            try { await action(() => operation === operationVersion); }
            catch (error) {
                if (operation === operationVersion) {
                    const passwordResetRequired = get().dialog === "sign-in" && typeof error === "object" && error !== null
                        && "code" in error && error.code === "auth/password-does-not-meet-requirements";
                    set({ passwordResetRequired, error: passwordResetRequired
                        ? "Your password must be updated to meet the current requirements. Request a password reset link to continue."
                        : accountError(error) });
                }
            }
            finally {
                if (operation === operationVersion) {
                    set({ pending: false });
                    if (get().user) void syncProfile();
                }
            }
        }

        async function signIn(action: () => Promise<AccountUser>) {
            await run(async isCurrent => {
                const user = await action();
                if (!isCurrent()) return;
                acceptUser(user);
                set({ dialog: null, storyPromptShown: true });
            });
        }

        return {
            user: null, status: service ? "loading" : "unavailable", configurationError,
            pending: false, error: null, notice: null, passwordResetRequired: false, profileStatus: "idle", dialog: null, storyPromptShown: false,
            start: () => {
                if (!service) return () => {};
                let active = true;
                const unsubscribe = service.subscribe(user => {
                    if (!active) return;
                    acceptUser(user);
                    if (!get().pending) void syncProfile();
                }, error => { if (active) set({ status: "unavailable", error: accountError(error) }); });
                return () => { active = false; identityVersion++; profileRequest++; operationVersion++; unsubscribe(); };
            },
            openDialog: dialog => {
                if (!get().pending) set({ dialog, error: null, notice: null, passwordResetRequired: false });
            },
            enterStories: () => {
                if (get().status === "ready" && !get().user && !get().storyPromptShown && !get().dialog) {
                    set({ storyPromptShown: true, dialog: "story-prompt" });
                }
            },
            signIn: (email, password) => signIn(() => service!.signIn(email.trim(), password)),
            signInWithGoogle: () => signIn(() => service!.signInWithGoogle()),
            validatePassword: password => service ? service.validatePassword(password) : Promise.reject(new Error("Account services are unavailable.")),
            signUp: (name, email, password) => run(async isCurrent => {
                if (!name.trim() || name.trim().length > 100) {
                    set({ error: "Enter a name between 1 and 100 characters." });
                    return;
                }
                const validation = await service!.validatePassword(password);
                if (!isCurrent()) return;
                if (!validation.isValid) {
                    set({ error: passwordRequirementError(validation) });
                    return;
                }
                const result = await service!.signUp(name.trim(), email.trim(), password);
                if (!isCurrent()) return;
                acceptUser(result.user);
                set({ dialog: "account", storyPromptShown: true, notice: result.warning ?? "Account created. Check your email for the verification link." });
            }),
            signOut: () => run(async isCurrent => {
                await service!.signOut();
                if (!isCurrent()) return;
                acceptUser(null);
                set({ dialog: null, profileStatus: "idle" });
            }),
            resetPassword: email => run(async isCurrent => {
                await service!.resetPassword(email.trim());
                if (isCurrent()) set({ notice: "If an account uses this email, you'll receive a password reset link." });
            }),
            sendVerification: () => run(async () => {
                const version = identityVersion;
                await service!.sendVerification();
                if (version === identityVersion) set({ notice: "Verification email sent. Check your inbox and spam folder." });
            }),
            checkVerification: () => run(async () => {
                const version = identityVersion;
                const user = await service!.reloadUser();
                if (version !== identityVersion) return;
                acceptUser(user);
                set({ notice: user?.emailVerified ? "Your email is verified." : "Your email is not verified yet. Open the link in your email, then check again." });
            }),
            retryProfile: syncProfile,
        };
    });
}
