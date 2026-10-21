import type { PasswordValidationStatus } from "firebase/auth";

// Representative Firebase SDK response for the user's console policy. Production
// policy is always obtained from Firebase; this fixture is used only in tests.
export function updatedPasswordValidation(overrides: Partial<PasswordValidationStatus> = {}): PasswordValidationStatus {
    return {
        isValid: false,
        meetsMinPasswordLength: false,
        meetsMaxPasswordLength: true,
        containsUppercaseLetter: false,
        containsLowercaseLetter: false,
        containsNumericCharacter: false,
        containsNonAlphanumericCharacter: false,
        passwordPolicy: {
            customStrengthOptions: {
                minPasswordLength: 12, maxPasswordLength: 4096,
                containsUppercaseLetter: true, containsLowercaseLetter: true,
                containsNumericCharacter: true, containsNonAlphanumericCharacter: true,
            },
            allowedNonAlphanumericCharacters: "^$*.[]{}()?\"!@#%&/\\,><':;|_~",
            enforcementState: "ENFORCE",
            forceUpgradeOnSignin: true,
        },
        ...overrides,
    };
}
