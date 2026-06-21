"use client";

import React, { useState, useEffect, useRef } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDeleteButtonProps {
  onDelete: () => void;
  className?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  confirmIcon?: React.ReactNode;
}

export function ConfirmDeleteButton({
  onDelete,
  className,
  tooltip = "Delete",
  icon,
  confirmIcon,
}: ConfirmDeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3000); // 3 seconds countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isConfirming) {
      // First click: Enter confirming state
      setIsConfirming(true);
      setTimeLeft(3000);

      const startTime = Date.now();
      const duration = 3000;

      // Start the interval to update the SVG ring
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
        }
      }, 30);

      // Revert after duration
      timerRef.current = setTimeout(() => {
        setIsConfirming(false);
      }, duration);
    } else {
      // Second click: Delete!
      cleanup();
      onDelete();
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsConfirming(false);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  // SVG ring properties
  const radius = 10;
  const strokeWidth = 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isConfirming
    ? circumference - (timeLeft / 3000) * circumference
    : circumference;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative flex items-center justify-center transition-all duration-300 select-none overflow-hidden rounded-lg cursor-pointer",
        isConfirming 
          ? "border-red-500/50 bg-red-950/20 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] scale-105" 
          : "border-border bg-black/15 hover:border-red-500/30 hover:bg-red-500/10 text-muted-foreground hover:text-red-500",
        className
      )}
      title={isConfirming ? "Click again to confirm delete" : tooltip}
      type="button"
    >
      {/* SVG Countdown Ring */}
      {isConfirming && (
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.1)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="rgb(239, 68, 68)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>
      )}

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center">
        {isConfirming ? (
          confirmIcon || <AlertTriangle className="h-3 w-3 animate-pulse" />
        ) : (
          icon || <Trash2 className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}
