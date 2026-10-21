import {
    createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, reload,
    sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
    signInWithPopup, signOut, updateProfile, validatePassword,
    type Auth, type User,
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp, type Firestore } from "firebase/firestore";
import type { AccountService, AccountUser } from "../store/authSession";

function accountUser(user: User): AccountUser {
    return { uid: user.uid, displayName: user.displayName, email: user.email, emailVerified: user.emailVerified };
}

export function createAccountService(auth: Auth, db: Firestore): AccountService {
    return {
        subscribe: (next, error) => onAuthStateChanged(auth, user => next(user ? accountUser(user) : null), error),
        signIn: async (email, password) => accountUser((await signInWithEmailAndPassword(auth, email, password)).user),
        signInWithGoogle: async () => accountUser((await signInWithPopup(auth, new GoogleAuthProvider())).user),
        validatePassword: password => validatePassword(auth, password),
        signUp: async (name, email, password) => {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            const warnings: string[] = [];
            try { await updateProfile(user, { displayName: name }); }
            catch { warnings.push("Your account was created, but your name couldn't be saved. You can still sign in."); }
            try { await sendEmailVerification(user); }
            catch { warnings.push("The verification email couldn't be sent. Use Resend verification email below."); }
            return { user: accountUser(user), warning: warnings.length ? warnings.join(" ") : undefined };
        },
        signOut: () => signOut(auth),
        resetPassword: async email => {
            try { await sendPasswordResetEmail(auth, email); }
            catch (error) {
                if (!(typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found")) throw error;
            }
        },
        sendVerification: async () => {
            if (!auth.currentUser) throw new Error("No authenticated user");
            await sendEmailVerification(auth.currentUser);
        },
        reloadUser: async () => {
            const user = auth.currentUser;
            if (!user) return null;
            await reload(user);
            await user.getIdToken(true);
            return auth.currentUser?.uid === user.uid ? accountUser(user) : null;
        },
        syncProfile: async user => {
            const ref = doc(db, "users", user.uid);
            const displayName = (user.displayName?.trim() || user.email?.split("@")[0] || "Learner").slice(0, 100);
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(ref);
                if (auth.currentUser?.uid !== user.uid) return;
                if (!snapshot.exists()) {
                    transaction.set(ref, { displayName, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                } else if (snapshot.data().displayName !== displayName) {
                    transaction.update(ref, { displayName, updatedAt: serverTimestamp() });
                }
            });
        },
    };
}
