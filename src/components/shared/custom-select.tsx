"use client";

/**
 * CustomSelect — premium animated dropdown replacing native <select>.
 *
 * Usage:
 *   <CustomSelect
 *     value={val}
 *     onChange={(v) => setVal(v)}
 *     options={[{ value: "a", label: "Option A", icon: SomeIcon }]}
 *     placeholder="Pick one"
 *   />
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  /** Optional lucide icon component */
  icon?: React.ElementType;
  /** Optional accent colour class, e.g. "text-green-400" */
  color?: string;
}

export interface CustomSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  /** Size preset */
  size?: "sm" | "md";
  /** Open direction */
  direction?: "down" | "up";
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  size = "md",
  direction = "down",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const SelectedIcon = selectedOption?.icon;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const px = size === "sm" ? "px-2.5 py-1.5" : "px-3.5 py-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  const menuVariants = {
    hidden: {
      opacity: 0,
      scale: 0.96,
      y: direction === "down" ? -6 : 6,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 420, damping: 28 },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      y: direction === "down" ? -4 : 4,
      transition: { duration: 0.12 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -4 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.025,
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
      },
    }),
  };

  return (
    <div
      ref={ref}
      className={cn("relative inline-block text-left select-none", className)}
    >
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className={cn(
          "flex items-center justify-between w-full gap-2 rounded-xl border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97]",
          "bg-card/80 backdrop-blur-sm shadow-sm",
          isOpen
            ? "border-primary/50 bg-primary/5 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
            : "border-border hover:border-primary/30 hover:bg-muted/30",
          px,
          textSize
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {SelectedIcon && (
            <SelectedIcon
              className={cn(
                "shrink-0",
                size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
                selectedOption?.color ?? "text-primary"
              )}
            />
          )}
          <span
            className={cn(
              "truncate font-semibold",
              selectedOption
                ? (selectedOption.color ?? "text-foreground")
                : "text-muted-foreground/60"
            )}
          >
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "shrink-0 text-muted-foreground/60 transition-transform duration-200",
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
            isOpen && "rotate-180 text-primary/70"
          )}
        />
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute z-[200] w-full min-w-[160px] origin-top-left",
              direction === "down"
                ? "top-[calc(100%+6px)]"
                : "bottom-[calc(100%+6px)]",
              "left-0 rounded-2xl border border-border/60",
              "bg-card/95 backdrop-blur-2xl",
              "shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
              "p-1.5 overflow-hidden"
            )}
          >
            {/* Subtle gradient inner glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at top left, hsl(var(--primary)/0.07), transparent 60%)",
              }}
            />

            <div className="relative flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
              {options.map((opt, i) => {
                const isSelected = opt.value === value;
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={String(opt.value)}
                    type="button"
                    custom={i}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between w-full rounded-xl px-3 py-2 text-left transition-all cursor-pointer focus:outline-none",
                      textSize,
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold shadow-sm"
                        : "text-foreground/80 hover:bg-muted/60 hover:text-foreground font-medium"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate">
                      {Icon && (
                        <Icon
                          className={cn(
                            "shrink-0",
                            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
                            isSelected
                              ? "text-primary"
                              : (opt.color ?? "text-muted-foreground/70")
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "truncate",
                          !isSelected && opt.color ? opt.color : ""
                        )}
                      >
                        {opt.label}
                      </span>
                    </span>
                    {isSelected && (
                      <Check
                        className={cn(
                          "shrink-0 text-primary",
                          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
                        )}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
