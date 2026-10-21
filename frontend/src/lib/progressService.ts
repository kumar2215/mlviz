import { collection, doc, onSnapshot, runTransaction, serverTimestamp, type Firestore } from "firebase/firestore";
import type { Auth } from "firebase/auth";
import { mergeProgress, readProgress, stableId } from "./storyProgress.ts";
import type { ProgressService } from "./progressSync.ts";

export function createProgressService(auth: Auth, db: Firestore): ProgressService {
    const checkOwner = (uid: string) => { if (auth.currentUser?.uid !== uid) throw new Error("Account changed during progress sync"); };
    return {
        watch: (uid, next, error, ready) => {
            checkOwner(uid);
            return onSnapshot(collection(db, "users", uid, "storyProgress"), snapshot => {
                if (auth.currentUser?.uid !== uid) return;
                for (const change of snapshot.docChanges()) {
                    if (change.type === "removed") continue;
                    const value = readProgress(change.doc.data());
                    if (!value || !stableId(change.doc.id)) { error(); continue; }
                    next(change.doc.id, value);
                }
                ready?.();
            }, error);
        },
        merge: async (uid, storyId, value) => {
            checkOwner(uid);
            if (!stableId(storyId)) throw new Error("Invalid story ID");
            return runTransaction(db, async transaction => {
                const ref = doc(db, "users", uid, "storyProgress", storyId);
                const snapshot = await transaction.get(ref);
                checkOwner(uid);
                const remote = snapshot.exists() ? readProgress(snapshot.data()) : undefined;
                if (snapshot.exists() && !remote) throw new Error("Unsupported account progress");
                const merged = mergeProgress(value, remote ?? undefined);
                transaction.set(ref, { ...merged, updatedAt: serverTimestamp() });
                return merged;
            });
        },
    };
}
