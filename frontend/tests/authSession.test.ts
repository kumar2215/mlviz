import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { createAuthSession, accountError, type AccountService, type AccountUser } from "../src/store/authSession.ts";
import { readFirebaseConfig } from "../src/lib/firebaseConfig.ts";
import { updatedPasswordValidation } from "./fixtures/passwordPolicy.ts";

const learner: AccountUser = { uid: "alice", displayName: "Alice", email: "alice@example.com", emailVerified: false };

function harness(overrides: Partial<AccountService> = {}) {
    let next: (user: AccountUser | null) => void = () => {};
    const calls: string[] = [];
    const service: AccountService = {
        subscribe: callback => { next = callback; return () => {}; },
        signIn: async () => learner,
        signUp: async () => ({ user: learner }),
        validatePassword: async () => ({ isValid: true, passwordPolicy: { customStrengthOptions: {}, allowedNonAlphanumericCharacters: "", enforcementState: "ENFORCE", forceUpgradeOnSignin: false } }),
        signInWithGoogle: async () => learner,
        signOut: async () => {},
        resetPassword: async () => {},
        sendVerification: async () => {},
        reloadUser: async () => ({ ...learner, emailVerified: true }),
        syncProfile: async user => { calls.push(user.uid); },
        ...overrides,
    };
    const store = createAuthSession(service);
    const stop = store.getState().start();
    return { store, calls, stop, emit: (user: AccountUser | null) => next(user) };
}

test("missing configuration leaves learning available without manufacturing a session", async () => {
    const config = readFirebaseConfig({});
    assert.match(config.error!, /VITE_FIREBASE_API_KEY/);
    const store = createAuthSession(null, config.error);
    await store.getState().signIn("a@example.com", "password");
    store.getState().enterStories();
    assert.equal(store.getState().status, "unavailable");
    assert.equal(store.getState().user, null);
    assert.equal(store.getState().dialog, null);
});

test("guest prompt waits for Firebase and only appears once per app session", () => {
    const { store, emit } = harness();
    store.getState().enterStories();
    assert.equal(store.getState().dialog, null);
    emit(null);
    store.getState().enterStories();
    assert.equal(store.getState().dialog, "story-prompt");
    store.getState().openDialog(null);
    store.getState().enterStories();
    assert.equal(store.getState().dialog, null);
});

test("restored Firebase sessions suppress the prompt and save the correct profile", async () => {
    const { store, emit, calls } = harness();
    emit(learner);
    store.getState().enterStories();
    await setImmediate();
    assert.equal(store.getState().dialog, null);
    assert.equal(store.getState().user?.uid, "alice");
    assert.equal(store.getState().profileStatus, "saved");
    assert.deepEqual(calls, ["alice"]);
});

test("registration trims name and email while preserving the password exactly", async () => {
    let submitted: string[] = [];
    const { store, emit } = harness({ signUp: async (...args) => { submitted = args; return { user: learner, warning: "Verification delivery failed." }; } });
    emit(null);
    await store.getState().signUp(" Alice ", " alice@example.com ", " password ");
    assert.deepEqual(submitted, ["Alice", "alice@example.com", " password "]);
    assert.equal(store.getState().user?.uid, "alice");
    assert.equal(store.getState().dialog, "account");
    assert.match(store.getState().notice!, /delivery failed/);
});

test("successful sign-in closes the form; failed sign-out preserves the session", async () => {
    const { store, emit } = harness({ signOut: async () => { throw { code: "auth/network-request-failed" }; } });
    emit(null);
    store.getState().openDialog("sign-in");
    await store.getState().signIn("alice@example.com", "password");
    assert.equal(store.getState().dialog, null);
    await store.getState().signOut();
    assert.equal(store.getState().user?.uid, "alice");
    assert.match(store.getState().error!, /internet/);
});

test("profile failures do not fail authentication and can be retried", async () => {
    let fail = true;
    const { store, emit } = harness({ syncProfile: async () => { if (fail) throw new Error("offline"); } });
    emit(null);
    await store.getState().signInWithGoogle();
    await setImmediate();
    assert.equal(store.getState().user?.uid, "alice");
    assert.equal(store.getState().error, null);
    assert.equal(store.getState().profileStatus, "error");
    fail = false;
    await store.getState().retryProfile();
    assert.equal(store.getState().profileStatus, "saved");
});

test("late profile failures cannot overwrite the next account or signed-out state", async () => {
    let reject: (error: Error) => void = () => {};
    const { store, emit } = harness({ syncProfile: user => user.uid === "alice" ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve() });
    emit(learner);
    emit({ ...learner, uid: "bob" });
    await setImmediate();
    reject(new Error("late failure"));
    await setImmediate();
    assert.equal(store.getState().user?.uid, "bob");
    assert.equal(store.getState().profileStatus, "saved");
    emit(null);
    assert.equal(store.getState().profileStatus, "idle");
});

test("duplicate submissions are blocked and observer disposal ignores late notifications", async () => {
    let resolve: (user: AccountUser) => void = () => {};
    let count = 0;
    const { store, emit, stop } = harness({ signIn: () => { count++; return new Promise(done => { resolve = done; }); } });
    emit(null);
    const first = store.getState().signIn("alice@example.com", "password");
    await store.getState().signIn("alice@example.com", "password");
    assert.equal(count, 1);
    assert.equal(store.getState().pending, true);
    resolve(learner);
    await first;
    stop();
    emit(null);
    assert.equal(store.getState().user?.uid, "alice");
});

test("verification refresh updates auth state; reset messages do not enumerate users", async () => {
    const { store, emit } = harness();
    emit(learner);
    await store.getState().checkVerification();
    assert.equal(store.getState().user?.emailVerified, true);
    await store.getState().resetPassword("unknown@example.com");
    assert.match(store.getState().notice!, /^If an account/);
    assert.equal(accountError({ code: "auth/user-not-found" }), accountError({ code: "auth/wrong-password" }));
    assert.match(accountError({ code: "auth/popup-closed-by-user" }), /cancelled/);
});

test("disposed sessions ignore authentication operations that finish later", async () => {
    let resolve: (user: AccountUser) => void = () => {};
    const { store, emit, stop } = harness({ signIn: () => new Promise(done => { resolve = done; }) });
    emit(null);
    const operation = store.getState().signIn("alice@example.com", "password");
    stop();
    resolve(learner);
    await operation;
    assert.equal(store.getState().user, null);
});

test("signup checks Firebase's policy even if the browser's form constraints are bypassed", async () => {
    let registrations = 0;
    const { store, emit } = harness({
        validatePassword: async () => updatedPasswordValidation({ containsUppercaseLetter: true, containsLowercaseLetter: true }),
        signUp: async () => { registrations++; return { user: learner }; },
    });
    emit(null);
    await store.getState().signUp("Alice", "alice@example.com", "Short");
    assert.equal(registrations, 0);
    assert.equal(store.getState().user, null);
    assert.match(store.getState().error!, /At least 12 characters/);
    assert.match(store.getState().error!, /number/);
    assert.match(store.getState().error!, /special character/);
    assert.doesNotMatch(store.getState().error!, /An uppercase letter/);
});

test("a password meeting policy is accepted without strength-based blocking or truncation", async () => {
    const password = `Ab1!${"x".repeat(4092)}`;
    let received = "";
    const { store, emit } = harness({
        validatePassword: async input => { assert.equal(input, password); return updatedPasswordValidation({ isValid: true }); },
        signUp: async (_name, _email, input) => { received = input; return { user: learner }; },
    });
    emit(null);
    await store.getState().signUp("Alice", "alice@example.com", password);
    assert.equal(received, password);
    assert.equal(store.getState().user?.uid, learner.uid);
});

test("password policy service failures cannot create an account", async () => {
    let registrations = 0;
    const { store, emit } = harness({
        validatePassword: async () => { throw { code: "auth/network-request-failed" }; },
        signUp: async () => { registrations++; return { user: learner }; },
    });
    emit(null);
    await store.getState().signUp("Alice", "alice@example.com", "Password123!");
    assert.equal(registrations, 0);
    assert.match(store.getState().error!, /internet connection/);
    assert.equal(store.getState().pending, false);
});

test("sign-in leaves existing passwords to Firebase and exposes the reset path for forced upgrades", async () => {
    let checks = 0;
    let received = "";
    const { store, emit } = harness({
        validatePassword: async () => { checks++; return updatedPasswordValidation(); },
        signIn: async (_email, password) => { received = password; throw { code: "auth/password-does-not-meet-requirements" }; },
    });
    emit(null);
    store.getState().openDialog("sign-in");
    await store.getState().signIn("alice@example.com", "old");
    assert.equal(checks, 0);
    assert.equal(received, "old");
    assert.equal(store.getState().passwordResetRequired, true);
    assert.match(store.getState().error!, /password reset/);
    store.getState().openDialog("reset-password");
    assert.equal(store.getState().passwordResetRequired, false);
});
