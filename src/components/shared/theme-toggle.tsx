"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className={cn("h-9 w-9 rounded-lg border border-border bg-card", className)} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      id="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-9 w-9 rounded-lg border border-border bg-card",
        "flex items-center justify-center",
        "transition-all duration-300 hover:bg-muted",
        "focus-ring",
        className
      )}
      aria-label="Toggle theme"
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all duration-300",
          isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100"
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"
        )}
      />
    </button>
  );
}
