"use client";

import { useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Loader2, Mail, Lock, User,
  ShieldCheck, RefreshCw, ArrowLeft, CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/shared";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { OtpInput, PasswordStrengthBar, useCountdown } from "@/components/auth/otp-input";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { sendRegistrationOtp, verifyOtpAndRegister, resendOtp } from "@/actions/otp";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "form" | "otp" | "success";

export default function RegisterPage() {
  const [showPassword, setShowPassword]       = useState(false);
  const [step, setStep]                       = useState<Step>("form");
  const [pendingEmail, setPendingEmail]        = useState("");
  const [otpValue, setOtpValue]               = useState("");
  const [isPending, startTransition]          = useTransition();
  const [isAutoLogging, setIsAutoLogging]     = useState(false);
  const router                                = useRouter();

  // Store plain-text password for auto-login after OTP verification
  const plainPasswordRef = useRef("");

  const { remaining, start: startTimer, reset: resetTimer, expired } = useCountdown(60);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");

  // ── Step 1: Validate + send OTP ─────────────────────────
  const onSubmit = (data: RegisterInput) => {
    plainPasswordRef.current = data.password; // store for auto-login
    startTransition(async () => {
      const result = await sendRegistrationOtp(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPendingEmail(data.email);
        setStep("otp");
        startTimer();
        if (result.devNote) {
          toast.info(`DEV MODE: ${result.devNote}`, { duration: 8000 });
        } else {
          toast.success(`Verification code sent to ${data.email}`);
        }
      }
    });
  };

  // ── Step 2: Verify OTP + create account + auto-login ────
  const handleVerifyOtp = () => {
    if (otpValue.replace(/\D/g, "").length < 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    startTransition(async () => {
      const result = await verifyOtpAndRegister(pendingEmail, otpValue);
      if (result.error) {
        toast.error(result.error);
        setOtpValue("");
      } else {
        toast.success("Account created! Signing you in...");
        setStep("success");

        // Auto-login after account creation
        try {
          setIsAutoLogging(true);
          await signIn("credentials", {
            email:    pendingEmail,
            password: plainPasswordRef.current,
            redirect: false,
          });
          // Small delay for UX then redirect
          setTimeout(() => router.push("/dashboard"), 1200);
        } catch {
          // If auto-login fails, just go to login page
          setTimeout(() => router.push("/login"), 1500);
        } finally {
          setIsAutoLogging(false);
        }
      }
    });
  };

  // ── Resend OTP ───────────────────────────────────────────
  const handleResend = () => {
    startTransition(async () => {
      const result = await resendOtp(pendingEmail);
      if (result.error) {
        toast.error(result.error);
      } else {
        if (result.devNote) {
          toast.info(`DEV MODE: ${result.devNote}`, { duration: 8000 });
        } else {
          toast.success("New code sent!");
        }
        setOtpValue("");
        resetTimer();
      }
    });
  };

  const handleGoogleSignIn = () => signIn("google", { callbackUrl: "/dashboard" });

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

          {/* ── Step 1: Registration Form ── */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <Logo size="lg" showText={false} />
                </div>
                <h1 className="text-2xl font-bold mb-2">Create Account</h1>
                <p className="text-sm text-muted-foreground">
                  Start your interview preparation journey
                </p>
              </div>

              {/* Google Sign In */}
              <button
                id="google-signup"
                onClick={handleGoogleSignIn}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors py-3 px-4 text-sm font-medium mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="name"
                      type="text"
                      {...register("name")}
                      placeholder="John Doe"
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-xl border bg-card pl-10 pr-4 py-3 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "placeholder:text-muted-foreground/50 transition-all duration-200",
                        errors.name ? "border-destructive" : "border-border"
                      )}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="you@example.com"
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-xl border bg-card pl-10 pr-4 py-3 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "placeholder:text-muted-foreground/50 transition-all duration-200",
                        errors.email ? "border-destructive" : "border-border"
                      )}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      placeholder="••••••••"
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-xl border bg-card pl-10 pr-12 py-3 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "placeholder:text-muted-foreground/50 transition-all duration-200",
                        errors.password ? "border-destructive" : "border-border"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Live password strength meter */}
                  <PasswordStrengthBar password={passwordValue} />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      {...register("confirmPassword")}
                      placeholder="••••••••"
                      disabled={isPending}
                      className={cn(
                        "w-full rounded-xl border bg-card pl-10 pr-4 py-3 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "placeholder:text-muted-foreground/50 transition-all duration-200",
                        errors.confirmPassword ? "border-destructive" : "border-border"
                      )}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
                </div>

                {/* Submit */}
                <button
                  id="register-submit"
                  type="submit"
                  disabled={isPending}
                  className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending verification code...</>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
                  Sign in
                </Link>
              </p>
            </motion.div>
          )}

          {/* ── Step 2: OTP Verification ── */}
          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Back button */}
              <button
                onClick={() => { setStep("form"); setOtpValue(""); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{pendingEmail}</p>
              </div>

              {/* OTP digits */}
              <div className="mb-6">
                <OtpInput
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={isPending}
                />
              </div>

              {/* Verify button */}
              <button
                onClick={handleVerifyOtp}
                disabled={isPending || otpValue.replace(/\D/g, "").length < 6}
                className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  "Verify & Create Account"
                )}
              </button>

              {/* Resend */}
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
                    Resend code in{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {remaining}s
                    </span>
                  </p>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
              </p>
            </motion.div>
          )}

          {/* ── Step 3: Success + Auto-login ── */}
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
              <h1 className="text-2xl font-bold mb-2">Account created!</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Your email has been verified. Signing you in...
              </p>
              {isAutoLogging && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to dashboard...
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
