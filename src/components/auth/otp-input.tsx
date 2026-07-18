"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ── OTP digit input component ──────────────────────────────
interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  length?: number;
}

export function OtpInput({ value = "", onChange, disabled = false, length = 6 }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const handleChange = (i: number, char: string) => {
    const d = char.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next.join(""));
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!digits[i] && i > 0) {
        const next = [...digits];
        next[i - 1] = "";
        onChange(next.join(""));
        refs.current[i - 1]?.focus();
      } else {
        const next = [...digits];
        next[i] = "";
        onChange(next.join(""));
      }
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  // Auto-focus first empty box on mount
  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d);
    refs.current[firstEmpty === -1 ? 0 : firstEmpty]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "w-12 h-14 text-center text-xl font-bold rounded-xl border-2",
            "focus:outline-none transition-all duration-200",
            "bg-background/80",
            d
              ? "border-primary text-primary shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
              : "border-border/70 hover:border-border text-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}

// ── Countdown timer hook ───────────────────────────────────
// Starts paused; call `start()` to begin the countdown.
export function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const active = useRef(false);

  const start = useCallback(() => {
    active.current = true;
    setRemaining(seconds);
  }, [seconds]);

  const reset = useCallback(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!active.current || remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  return { remaining, start, reset, expired: active.current && remaining <= 0 };
}

// ── Password strength calculator ───────────────────────────
export type StrengthLevel = "empty" | "weak" | "medium" | "strong" | "very-strong";

export interface PasswordStrength {
  level: StrengthLevel;
  score: number; // 0–4
  label: string;
  color: string;
  width: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { level: "empty", score: 0, label: "", color: "bg-border", width: "w-0" };

  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password))   score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: Record<number, Omit<PasswordStrength, "score">> = {
    0: { level: "weak",        label: "Too short",   color: "bg-red-500",    width: "w-1/4" },
    1: { level: "weak",        label: "Weak",        color: "bg-red-500",    width: "w-1/4" },
    2: { level: "medium",      label: "Fair",        color: "bg-orange-500", width: "w-2/4" },
    3: { level: "medium",      label: "Good",        color: "bg-yellow-500", width: "w-3/4" },
    4: { level: "strong",      label: "Strong",      color: "bg-green-500",  width: "w-full" },
    5: { level: "very-strong", label: "Very Strong", color: "bg-emerald-500",width: "w-full" },
  };

  return { score, ...levels[Math.min(score, 5)] };
}

// ── Password strength bar component ───────────────────────
interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Bar */}
      <div className="h-1.5 w-full bg-border/50 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            strength.color,
            strength.width
          )}
        />
      </div>
      {/* Label + hints */}
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium transition-colors", {
          "text-red-500":     strength.level === "weak",
          "text-orange-500":  strength.score === 2,
          "text-yellow-500":  strength.score === 3,
          "text-green-500":   strength.level === "strong",
          "text-emerald-500": strength.level === "very-strong",
        })}>
          {strength.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {[
            !/.{8}/.test(password) && "8+ chars",
            !/[A-Z]/.test(password) && "uppercase",
            !/[a-z]/.test(password) && "lowercase",
            !/\d/.test(password) && "number",
            !/[^A-Za-z0-9]/.test(password) && "symbol",
          ].filter(Boolean).join(" · ") || "✓ All requirements met"}
        </span>
      </div>
    </div>
  );
}
