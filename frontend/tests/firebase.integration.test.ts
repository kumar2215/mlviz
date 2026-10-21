import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, deleteDoc, deleteField, doc, getDoc, getDocs, collection, getFirestore, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { createAccountService } from "../src/lib/accountService.ts";

const projectId = "demo-mlviz-auth";
let env: RulesTestEnvironment;
before(async () => {
    env = await initializeTestEnvironment({ projectId, firestore: {
        host: "127.0.0.1", port: 8088,
        rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    } });
});
after(async () => { await env?.cleanup(); });

function profile() { return { displayName: "Alice", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; }
function userDoc(uid: string, owner = uid) { return doc(env.authenticatedContext(uid).firestore(), "users", owner); }

test("owners can create/read/update their own valid profile", async () => {
    const ref = userDoc("owner");
    await assertSucceeds(setDoc(ref, profile()));
    const original = (await assertSucceeds(getDoc(ref))).data()!;
    await assertSucceeds(updateDoc(ref, { displayName: "New name", updatedAt: serverTimestamp() }));
    assert.ok((await getDoc(ref)).data()!.createdAt.isEqual(original.createdAt));
});

test("guests, other users, collection listing, deletion, and subcollections are denied", async () => {
    await setDoc(userDoc("private"), profile());
    const guest = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(guest, "users", "private")));
    await assertFails(setDoc(doc(guest, "users", "guest"), profile()));
    await assertFails(getDoc(userDoc("attacker", "private")));
    await assertFails(setDoc(userDoc("attacker", "private"), profile()));
    await assertFails(updateDoc(userDoc("attacker", "private"), { displayName: "Hijacked", updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(userDoc("private")));
    await assertFails(getDocs(collection(env.authenticatedContext("private").firestore(), "users")));
    await assertFails(setDoc(doc(env.authenticatedContext("private").firestore(), "users/private/nested/item"), { displayName: "Hidden" }));
    await assertFails(setDoc(doc(env.authenticatedContext("private").firestore(), "other/item"), profile()));
});

test("create AND update enforce schema, size limits, required fields, ownership and timestamps", async () => {
    const invalid: Record<string, unknown>[] = [
        { displayName: "" }, { displayName: "   " }, { displayName: "a".repeat(101) },
        { displayName: 42 }, { displayName: ["Alice"] }, { createdAt: "yesterday" },
        { createdAt: Timestamp.fromMillis(0) }, { updatedAt: Timestamp.fromMillis(0) },
        { updatedAt: Timestamp.fromMillis(Date.now() + 86400000) },
        { role: "admin" }, { uid: "someone-else" }, { email: "private@example.com" },
        { xp: -1 }, { extraData: "injected" }, { photoURL: "users/someone-else" },
    ];
    for (const [index, change] of invalid.entries()) {
        await assertFails(setDoc(userDoc(`bad-create-${index}`), { ...profile(), ...change }));
        const existing = userDoc(`bad-update-${index}`);
        await setDoc(existing, profile());
        await assertFails(updateDoc(existing, { updatedAt: serverTimestamp(), ...change }));
    }
    for (const field of ["displayName", "createdAt", "updatedAt"]) {
        const missing = profile() as Record<string, unknown>;
        delete missing[field];
        await assertFails(setDoc(userDoc(`missing-${field}`), missing));
        const existing = userDoc(`delete-${field}`);
        await setDoc(existing, profile());
        await assertFails(updateDoc(existing, { [field]: deleteField() }));
    }
});

test("real Auth + Firestore SDKs register, verify, sign in, persist one profile and sign out", async () => {
    const app = initializeApp({ projectId, apiKey: "fake-api-key", authDomain: `${projectId}.firebaseapp.com` }, "integration");
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8088);
    const service = createAccountService(auth, db);
    try {
        const email = `learner-${Date.now()}@example.com`;
        const { user, warning } = await service.signUp("Test Learner", email, "test-password-123");
        assert.equal(warning, undefined);
        assert.equal(user.displayName, "Test Learner");
        assert.equal(user.emailVerified, false);
        await service.syncProfile(user);
        const ref = doc(db, "users", user.uid);
        const original = (await getDoc(ref)).data()!;
        assert.equal(original.displayName, "Test Learner");
        // Emulator-only endpoint retrieves the verification link without accessing a real inbox.
        const response = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`);
        const { oobCodes } = await response.json() as { oobCodes: { email: string; oobCode: string; requestType: string }[] };
        const code = oobCodes.find(item => item.email === email && item.requestType === "VERIFY_EMAIL")!;
        assert.ok(code);
        const { applyActionCode } = await import("firebase/auth");
        await applyActionCode(auth, code.oobCode);
        assert.equal((await service.reloadUser())?.emailVerified, true);
        await service.resetPassword(email);
        await service.signOut();
        assert.equal(auth.currentUser, null);
        const restored = await service.signIn(email, "test-password-123");
        assert.equal(restored.uid, user.uid);
        await service.syncProfile(restored);
        assert.ok((await getDoc(ref)).data()!.createdAt.isEqual(original.createdAt));
        await service.signOut();
    } finally { await deleteApp(app); }
});
