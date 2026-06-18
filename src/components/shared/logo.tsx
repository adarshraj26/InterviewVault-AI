"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: "h-6 w-6", text: "text-lg" },
  md: { icon: "h-8 w-8", text: "text-xl" },
  lg: { icon: "h-10 w-10", text: "text-2xl" },
};

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const s = sizes[size];

  return (
    <motion.div
      className={cn("flex items-center gap-2.5", className)}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="relative">
        <div
          className={cn(
            "rounded-xl gradient-bg flex items-center justify-center",
            s.icon,
            "shadow-lg shadow-primary/25"
          )}
        >
          <Sparkles className="h-[55%] w-[55%] text-white" />
        </div>
        <div className="absolute -inset-0.5 rounded-xl gradient-bg opacity-30 blur-sm -z-10" />
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight", s.text)}>
          <span className="gradient-text">Interview</span>
          <span className="text-foreground">Vault</span>
          <span className="gradient-text ml-1 text-[0.65em] font-semibold align-super">AI</span>
        </span>
      )}
    </motion.div>
  );
}
