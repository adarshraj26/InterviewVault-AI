"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/shared";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators/auth";
import { forgotPassword } from "@/actions/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    startTransition(async () => {
      const result = await forgotPassword(data.email);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              Email
            </label>
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
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            id="forgot-password-submit"
            type="submit"
            disabled={isPending}
            className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* Back to login */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </motion.div>
  );
}
