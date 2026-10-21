import assert from "node:assert/strict";
import { test } from "node:test";
import { passwordRequirements, passwordRequirementError } from "../src/lib/passwordPolicy.ts";
import { estimatePasswordStrength } from "../src/lib/passwordStrength.ts";
import { updatedPasswordValidation } from "./fixtures/passwordPolicy.ts";

test("the checklist reflects Firebase's length and character requirements and returned results", () => {
    const requirements = passwordRequirements(updatedPasswordValidation({ containsUppercaseLetter: true }));
    assert.equal(requirements.length, 6);
    assert.deepEqual(requirements.slice(0, 2), [
        { id: "minimum", label: "At least 12 characters", met: false },
        { id: "maximum", label: "No more than 4096 characters", met: true },
    ]);
    assert.equal(requirements.find(rule => rule.id === "containsUppercaseLetter")?.met, true);
    assert.equal(requirements.find(rule => rule.id === "containsNonAlphanumericCharacter")?.met, false);
});

test("a changed Firebase policy replaces old limits and omits criteria that are not required", () => {
    const status = updatedPasswordValidation();
    const requirements = passwordRequirements({ ...status, passwordPolicy: {
        ...status.passwordPolicy, customStrengthOptions: { minPasswordLength: 20, containsUppercaseLetter: false },
    } });
    assert.deepEqual(requirements, [{ id: "minimum", label: "At least 20 characters", met: false }]);
});

test("specific errors contain only the unsatisfied criteria, including the maximum length", () => {
    const error = passwordRequirementError(updatedPasswordValidation({ meetsMinPasswordLength: true, meetsMaxPasswordLength: false, containsUppercaseLetter: true }));
    assert.match(error, /No more than 4096 characters/);
    assert.match(error, /lowercase/);
    assert.doesNotMatch(error, /At least 12|uppercase/);
});

test("strength estimates recognize predictable passwords independently of policy compliance", () => {
    const predictable = estimatePasswordStrength("Password123!")!;
    const random = estimatePasswordStrength("K7!mQ2@vZ9#pR4$wT6&xB8")!;
    assert.ok(predictable.score <= 1);
    assert.ok(random.score >= 3);
    assert.equal("password" in predictable, false);
    assert.equal("password" in random, false);
});

test("expensive strength estimation is skipped for long inputs without imposing a password limit", () => {
    assert.equal(estimatePasswordStrength(""), null);
    assert.equal(estimatePasswordStrength("a".repeat(129)), null);
    assert.equal(estimatePasswordStrength("a".repeat(4096)), null);
});
