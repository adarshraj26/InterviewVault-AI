"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff,
  ShieldCheck, RefreshCw, CheckCircle2, KeyRound,
} from "lucide-react";
import { Logo } from "@/components/shared";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { OtpInput, PasswordStrengthBar, useCountdown } from "@/components/auth/otp-input";
import {
  sendPasswordResetOtp,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
  changePasswordAfterReset,
} from "@/actions/password-reset";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { z } from "zod";

// ── Schemas ───────────────────────────────────────────────
const emailSchema   = z.object({ email: z.string().email("Invalid email address") });
const passwordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Uppercase required")
    .regex(/[a-z]/, "Lowercase required")
    .regex(/\d/, "Number required")
    .regex(/[^A-Za-z0-9]/, "Special character required"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmailInput    = z.infer<typeof emailSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;
type Step = "email" | "otp" | "password" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep]             = useState<Step>("email");
  const [pendingEmail, setPending]  = useState("");
  const [verifiedCode, setVerified] = useState("");
  const [otpValue, setOtpValue]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { remaining, start: startTimer, reset: resetTimer, expired } = useCountdown(60);

  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = passwordForm.watch("newPassword");

  // Step 1 — send OTP
  const onEmailSubmit = (data: EmailInput) => {
    startTransition(async () => {
      const result = await sendPasswordResetOtp(data.email);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPending(data.email);
        setStep("otp");
        startTimer();
        if (result.devNote) {
          toast.info(`DEV: ${result.devNote}`, { duration: 8000 });
        } else {
          toast.success(`Reset code sent to ${data.email}`);
        }
      }
    });
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = () => {
    if (otpValue.replace(/\D/g, "").length < 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    startTransition(async () => {
      const result = await verifyPasswordResetOtp(pendingEmail, otpValue);
      if (result.error) {
        toast.error(result.error);
        setOtpValue("");
      } else {
        setVerified(otpValue);
        setStep("password");
      }
    });
  };

  // Resend OTP
  const handleResend = () => {
    startTransition(async () => {
      const result = await resendPasswordResetOtp(pendingEmail);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("New code sent!");
        if (result.devNote) toast.info(`DEV: ${result.devNote}`, { duration: 8000 });
        setOtpValue("");
        resetTimer();
      }
    });
  };

  // Step 3 — set new password
  const onPasswordSubmit = (data: PasswordInput) => {
    startTransition(async () => {
      const result = await changePasswordAfterReset(pendingEmail, verifiedCode, data.newPassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        setStep("success");
        toast.success(result.success);
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-4"
    >
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="glass-strong rounded-2xl p-8 shadow-2xl">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <Logo size="lg" showText={false} />
                </div>
                <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send a verification code
                </p>
              </div>

              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="fp-email" className="block text-sm font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="fp-email"
                      type="email"
                      {...emailForm.register("email")}
                      placeholder="you@example.com"
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-xl border bg-card pl-10 pr-4 py-3 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "placeholder:text-muted-foreground/50 transition-all duration-200",
                        emailForm.formState.errors.email ? "border-destructive" : "border-border"
                      )}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-destructive mt-1">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Send Reset Code"}
                </button>
              </form>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </motion.div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => { setStep("email"); setOtpValue(""); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a reset code to
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{pendingEmail}</p>
              </div>

              <div className="mb-6">
                <OtpInput value={otpValue} onChange={setOtpValue} disabled={isPending} />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isPending || otpValue.replace(/\D/g, "").length < 6}
                className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
              >
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Verify Code"}
              </button>

              <div className="text-center">
                {expired ? (
                  <button
                    onClick={handleResend}
                    disabled={isPending}
                    className="text-sm text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Resend code
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-semibold text-foreground tabular-nums">{remaining}s</span>
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: New Password ── */}
          {step === "password" && (
            <motion.div
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="h-8 w-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Set new password</h1>
                <p className="text-sm text-muted-foreground">
                  Choose a strong password for your account
                </p>
              </div>

              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                {/* New Password */}
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="new-password"
                      type={showPw ? "text" : "password"}
                      {...passwordForm.register("newPassword")}
                      placeholder="••••••••"
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-xl border bg-card pl-10 pr-12 py-3 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "placeholder:text-muted-foreground/50 transition-all duration-200",
                        passwordForm.formState.errors.newPassword ? "border-destructive" : "border-border"
                      )}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={newPassword} />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      {...passwordForm.register("confirmPassword")}
                      placeholder="••••••••"
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-xl border bg-card pl-10 pr-12 py-3 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "placeholder:text-muted-foreground/50 transition-all duration-200",
                        passwordForm.formState.errors.confirmPassword ? "border-destructive" : "border-border"
                      )}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Set New Password"}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 4: Success ── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 24 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 350, damping: 20 }}
                className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-2">Password updated!</h1>
              <p className="text-sm text-muted-foreground mb-8">
                Your password has been changed successfully. Sign in with your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25"
              >
                Go to Sign In
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
