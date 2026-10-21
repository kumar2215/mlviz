import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import { dictionary as commonDictionary, adjacencyGraphs } from "@zxcvbn-ts/language-common";
import { dictionary as englishDictionary, translations } from "@zxcvbn-ts/language-en";

export interface PasswordStrength {
    score: number;
    warning: string;
    suggestion: string;
}

const estimator = new ZxcvbnFactory({
    translations,
    dictionary: { ...commonDictionary, ...englishDictionary },
    graphs: adjacencyGraphs,
    maxLength: 128,
});

export function estimatePasswordStrength(password: string): PasswordStrength | null {
    // Avoid expensive estimates on long inputs. Never truncate the actual password.
    if (!password || password.length > 128) return null;
    const result = estimator.check(password);
    return { score: result.score, warning: result.feedback.warning ?? "", suggestion: result.feedback.suggestions[0] || "" };
}
