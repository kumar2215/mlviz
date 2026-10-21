import type { PasswordValidationStatus } from "firebase/auth";

export interface PasswordRequirement {
    id: string;
    label: string;
    met: boolean;
}

export function passwordRequirements(status: PasswordValidationStatus): PasswordRequirement[] {
    const options = status.passwordPolicy.customStrengthOptions;
    const requirements: PasswordRequirement[] = [];
    if (options.minPasswordLength !== undefined) requirements.push({
        id: "minimum", label: `At least ${options.minPasswordLength} characters`, met: status.meetsMinPasswordLength === true,
    });
    const characterRules = [
        ["containsUppercaseLetter", "An uppercase letter"],
        ["containsLowercaseLetter", "A lowercase letter"],
        ["containsNumericCharacter", "A number"],
        ["containsNonAlphanumericCharacter", "A special character"],
    ] as const;
    for (const [key, label] of characterRules) {
        if (options[key]) requirements.push({ id: key, label, met: status[key] === true });
    }
    return requirements;
}

export function passwordRequirementError(status: PasswordValidationStatus): string {
    const missing = passwordRequirements(status).filter(rule => !rule.met).map(rule => rule.label);
    return missing.length ? `Password requirements not met: ${missing.join("; ")}.` : "Review the password requirements and try again.";
}
