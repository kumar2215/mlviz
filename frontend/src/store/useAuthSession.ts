import { useStore } from "zustand";
import { createAuthSession } from "./authSession";
import { initializeFirebase } from "../lib/firebase";
import { createAccountService } from "../lib/accountService";

const firebase = initializeFirebase();
export const authSession = createAuthSession(
    firebase.auth && firebase.db ? createAccountService(firebase.auth, firebase.db) : null,
    firebase.error ?? null,
);

export function useAuthSession<T>(selector: (state: ReturnType<typeof authSession.getState>) => T): T {
    return useStore(authSession, selector);
}
