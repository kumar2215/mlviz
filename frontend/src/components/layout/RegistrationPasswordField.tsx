import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import type { PasswordPolicy, PasswordValidationStatus } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { passwordRequirements } from "@/lib/passwordPolicy";
import type { PasswordStrength } from "@/lib/passwordStrength";

interface Props {
    id: string;
    enabled: boolean;
    refreshKey: string | null;
    validatePassword: (password: string) => Promise<PasswordValidationStatus>;
}

export default function RegistrationPasswordField({ id, enabled, refreshKey, validatePassword }: Props) {
    const [password, setPassword] = useState("");
    const [retry, setRetry] = useState(0);
    const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
    const [checked, setChecked] = useState<{
        input: string; retry: number; refreshKey: string | null;
        result: PasswordValidationStatus | null; error: string | null;
    } | null>(null);
    const [estimated, setEstimated] = useState<{ input: string; result: PasswordStrength | null } | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let active = true;
        const timer = window.setTimeout(() => {
            void validatePassword(password).then(result => {
                if (!active) return;
                setPolicy(result.passwordPolicy);
                setChecked({ input: password, retry, refreshKey, result, error: null });
            }, () => {
                if (active) setChecked({ input: password, retry, refreshKey, result: null, error: "Couldn't check the password requirements. Check your connection and retry." });
            });
        }, password ? 250 : 0);
        return () => { active = false; window.clearTimeout(timer); };
    }, [password, enabled, retry, refreshKey, validatePassword]);

    useEffect(() => {
        if (!password || password.length > 128) return;
        let active = true;
        const timer = window.setTimeout(() => {
            void import("@/lib/passwordStrength").then(module => module.estimatePasswordStrength(password))
                .then(result => { if (active) setEstimated({ input: password, result }); })
                .catch(() => { if (active) setEstimated({ input: password, result: null }); });
        }, 250);
        return () => { active = false; window.clearTimeout(timer); };
    }, [password]);

    const current = enabled && checked?.input === password && checked.retry === retry && checked.refreshKey === refreshKey ? checked : null;
    const result = current?.result;
    const requirements = policy ? passwordRequirements(result ?? { isValid: false, passwordPolicy: policy }) : [];
    const strength = estimated?.input === password ? estimated.result : null;
    const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-sky-500", "bg-emerald-600"];
    const descriptionId = `${id}-requirements`;

    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-medium text-slate-700">Password</label>
            <Input id={id} name="password" type="password" required autoComplete="new-password"
                value={password} onChange={event => setPassword(event.target.value)}
                minLength={policy?.customStrengthOptions.minPasswordLength}
                aria-describedby={descriptionId} aria-invalid={password.length > 0 && !!result && !result.isValid} />
            <div id={descriptionId} className="space-y-2 text-xs text-slate-600">
                <p role="status" aria-live="polite">{current?.error || (!enabled ? "Password requirements will load when account services are ready." : !current ? (policy ? "Checking password…" : "Loading password requirements…") : password && result ? `${requirements.filter(rule => rule.met).length} of ${requirements.length} password requirements met.` : "Your password must meet these requirements:")}</p>
                {current?.error && <Button type="button" variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Retry password check</Button>}
                {requirements.length > 0 && <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Password requirements">
                    {requirements.map(rule => {
                        const met = password.length > 0 && rule.met;
                        const Icon = met ? CheckCircle2 : Circle;
                        return <li key={rule.id} className={`flex items-start gap-2 ${met ? "text-emerald-700" : "text-slate-600"}`}><Icon aria-hidden="true" className="mt-0.5 size-3 shrink-0" /><span><span className="sr-only">{met ? "Met: " : "Required: "}</span>{rule.label}</span></li>;
                    })}
                </ul>}
                {password && password.length <= 128 && strength && <div className="space-y-1.5 pt-1">
                    <div role="meter" aria-label="Estimated password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} aria-valuetext={labels[strength.score]} className="flex gap-1">
                        {labels.map((label, index) => <span key={label} aria-hidden="true" className={`h-1.5 flex-1 rounded-full ${index <= strength.score ? colors[strength.score] : "bg-slate-200"}`} />)}
                    </div>
                    <p>Estimated strength: <strong>{labels[strength.score]}</strong></p>
                    <p>{strength.warning || strength.suggestion || "Use a unique password you don't use elsewhere."}</p>
                </div>}
                {password.length > 128 && <p>Strength estimation is unavailable for long passwords. Your full password is still checked against the requirements.</p>}
            </div>
        </div>
    );
}
