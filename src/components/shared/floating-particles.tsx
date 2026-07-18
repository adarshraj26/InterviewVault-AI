"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;      // % from left
  y: number;      // % from top
  size: number;   // px
  duration: number; // animation speed
  delay: number;
  color: string;
  driftX: number;
  driftY: number;
}

const COLORS = [
  "hsl(239 84% 67%)",  // indigo
  "hsl(262 83% 58%)",  // violet
  "hsl(291 64% 42%)",  // purple
  "hsl(217 91% 60%)",  // blue
  "hsl(199 89% 48%)",  // cyan
];

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 4 + Math.random() * 8,
    duration: 8 + Math.random() * 14,
    delay: Math.random() * -20,
    color: COLORS[i % COLORS.length],
    driftX: (Math.random() - 0.5) * 120,
    driftY: (Math.random() - 0.5) * 120,
  }));
}

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

export function FloatingParticles({ count = 14, className }: FloatingParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Generate particles client-side only to avoid hydration mismatch
  useEffect(() => {
    setParticles(makeParticles(count));
  }, [count]);

  if (particles.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 ${className ?? ""}`}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full blur-[2px]"
          style={{
            left: `${p.x}%`,
            top:  `${p.y}%`,
            width:  p.size,
            height: p.size,
            background: p.color,
            opacity: 0.18,
          }}
          animate={{
            x: [0, p.driftX, -p.driftX * 0.6, 0],
            y: [0, p.driftY, -p.driftY * 0.5, 0],
            scale: [1, 1.3, 0.85, 1],
            opacity: [0.12, 0.28, 0.14, 0.12],
          }}
          transition={{
            duration: p.duration,
            delay:    p.delay,
            repeat:   Infinity,
            ease:     "easeInOut",
          }}
        />
      ))}

      {/* Large soft orbs in corners for depth */}
      <motion.div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
        style={{ background: "radial-gradient(circle, hsl(239 84% 67% / 0.06), transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle, hsl(262 83% 58% / 0.06), transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}
