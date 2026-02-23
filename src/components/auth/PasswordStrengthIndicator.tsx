"use client";

type Rule = {
  label: string;
  test: (p: string) => boolean;
};

const RULES: Rule[] = [
  { label: "At least 12 characters", test: (p) => p.length >= 12 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li key={rule.label} className="flex items-center gap-2 text-xs">
            <span
              className={
                passed ? "text-green-600 font-bold" : "text-gray-400"
              }
            >
              {passed ? "✓" : "×"}
            </span>
            <span className={passed ? "text-green-700" : "text-gray-500"}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
