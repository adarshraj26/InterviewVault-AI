"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
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
    <div
      className={cn(
        "rounded-xl p-6",
        variantClasses[variant],
        hover && "card-hover cursor-pointer",
        glow && "glow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
