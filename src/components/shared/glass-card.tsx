"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  variant?: "default" | "strong" | "subtle";
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = false,
  glow = false,
  ...props
}: GlassCardProps) {
  const variantClasses = {
    default: "glass",
    strong: "glass-strong",
    subtle: "glass-subtle",
  };

  return (
    <motion.div
      whileHover={hover ? { y: -5, scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 24 } } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
      className={cn(
        "rounded-xl p-6 transition-all duration-300",
        variantClasses[variant],
        hover && "cursor-pointer hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
        glow && "glow",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
