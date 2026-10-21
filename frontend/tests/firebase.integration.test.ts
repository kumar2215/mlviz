import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, deleteDoc, deleteField, doc, getDoc, getDocs, collection, getFirestore, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { createAccountService } from "../src/lib/accountService.ts";
import { createProgressService } from "../src/lib/progressService.ts";
import { emptyProgress } from "../src/lib/storyProgress.ts";

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

function storyProgress() {
    return { version: 1, milestones: ["visit:sort-flowers", "task:sort-flowers:root-sort"], checkpoint: { page: "sort-flowers", step: "", at: 1000, client: "integration-client" }, updatedAt: serverTimestamp() };
}

test("story progress is privately readable and queryable only by its owner", async () => {
    await setDoc(userDoc("progress-owner"), profile());
    const db = env.authenticatedContext("progress-owner").firestore();
    const ref = doc(db, "users/progress-owner/storyProgress/decision_tree");
    await assertSucceeds(setDoc(ref, storyProgress()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(getDocs(collection(db, "users/progress-owner/storyProgress")));
    await assertSucceeds(updateDoc(ref, { milestones: ["task:sort-flowers:root-sort", "task:sort-flowers:child-sort"], updatedAt: serverTimestamp() }));
    for (const other of [env.unauthenticatedContext().firestore(), env.authenticatedContext("progress-attacker").firestore()]) {
        const target = doc(other, "users/progress-owner/storyProgress/decision_tree");
        await assertFails(getDoc(target));
        await assertFails(setDoc(target, storyProgress()));
        await assertFails(updateDoc(target, { milestones: [], updatedAt: serverTimestamp() }));
        await assertFails(getDocs(collection(other, "users/progress-owner/storyProgress")));
    }
    await assertFails(deleteDoc(ref));
    await assertFails(setDoc(doc(db, "users/progress-owner/storyProgress/unknown_story"), storyProgress()));
    await assertFails(setDoc(doc(env.authenticatedContext("orphan").firestore(), "users/orphan/storyProgress/decision_tree"), storyProgress()));
});

test("progress create AND update reject malformed, oversized, forged and missing fields", async () => {
    const invalid: Record<string, unknown>[] = [
        { version: 2 }, { version: "1" }, { milestones: "complete" }, { milestones: [42] },
        { milestones: ["task:sort-flowers:root-sort", "task:sort-flowers:root-sort"] },
        { milestones: ["task:sort-flowers:made-up-task"] }, { milestones: ["x".repeat(10000)] },
        { milestones: Array(513).fill("visit:intro") }, { xp: 999999 }, { uid: "victim" }, { role: "admin" },
        { checkpoint: { page: "unknown", step: "", at: 1000, client: "client" } },
        { checkpoint: { page: "sort-flowers", step: "unknown", at: 1000, client: "client" } },
        { checkpoint: { page: "sort-flowers", step: "", at: -1, client: "client" } },
        { checkpoint: { page: "sort-flowers", step: "", at: 1000, client: "x".repeat(81) } },
        { checkpoint: { page: "sort-flowers", step: "", at: 1000, client: "client", extra: "hidden" } },
        { checkpoint: { page: "sort-flowers", at: 1000, client: "client" } },
        { updatedAt: Timestamp.fromMillis(0) },
    ];
    for (const [index, change] of invalid.entries()) {
        const uid = `progress-validation-${index}`;
        await setDoc(userDoc(uid), profile());
        const ref = doc(env.authenticatedContext(uid).firestore(), "users", uid, "storyProgress", "decision_tree");
        await assertFails(setDoc(ref, { ...storyProgress(), ...change }));
        await assertSucceeds(setDoc(ref, storyProgress()));
        await assertFails(updateDoc(ref, { updatedAt: serverTimestamp(), ...change }));
    }
    for (const field of ["version", "milestones", "checkpoint", "updatedAt"]) {
        const uid = `progress-required-${field}`;
        await setDoc(userDoc(uid), profile());
        const ref = doc(env.authenticatedContext(uid).firestore(), "users", uid, "storyProgress", "decision_tree");
        const missing: Record<string, unknown> = storyProgress();
        delete missing[field];
        await assertFails(setDoc(ref, missing));
        await assertSucceeds(setDoc(ref, storyProgress()));
        await assertFails(updateDoc(ref, { updatedAt: serverTimestamp(), [field]: deleteField() }));
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
        const progress = createProgressService(auth, db);
        const first = { ...emptyProgress(), milestones: ["task:sort-flowers:root-sort"], checkpoint: { page: "sort-flowers", step: "", at: 1000, client: "device-a" } };
        const second = { ...emptyProgress(), milestones: ["task:sort-flowers:child-sort"], checkpoint: { page: "sort-flowers", step: "", at: 2000, client: "device-b" } };
        await Promise.all([progress.merge(user.uid, "decision_tree", first), progress.merge(user.uid, "decision_tree", second)]);
        const savedProgress = (await getDoc(doc(db, "users", user.uid, "storyProgress", "decision_tree"))).data()!;
        assert.deepEqual(savedProgress.milestones, ["task:sort-flowers:child-sort", "task:sort-flowers:root-sort"]);
        assert.equal(savedProgress.checkpoint.client, "device-b");
        await assert.rejects(progress.merge("another-account", "decision_tree", first), /Account changed/);
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
