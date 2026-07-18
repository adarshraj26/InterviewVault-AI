import type { Variants } from "framer-motion";

// ── Entrance Variants ──────────────────────────────────────

export const fadeInUp: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeInDown: Variants = {
  hidden:  { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeInLeft: Variants = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeInRight: Variants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

// Spring pop-in with slight overshoot
export const popIn: Variants = {
  hidden:  { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 22 },
  },
};

// ── Container Variants (stagger children) ─────────────────

export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerFast: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.0 } },
};

// ── Sidebar nav item stagger ───────────────────────────────
export const sidebarItem: Variants = {
  hidden:  { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// ── Card stat pop ─────────────────────────────────────────
export const statCard: Variants = {
  hidden:  { opacity: 0, y: 32, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
};

// ── Page slide transitions ─────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, x: 30 },
  enter:   { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
};

// ── Continuous animations ─────────────────────────────────

// Floating drift for particles / decorations
export const floatDrift = (yRange: number, duration: number) => ({
  y: [-yRange, yRange, -yRange],
  transition: {
    duration,
    repeat: Infinity,
    ease: "easeInOut",
  },
});

// Gentle pulse glow
export const glowPulse = {
  scale: [1, 1.08, 1],
  opacity: [0.6, 1, 0.6],
  transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
};

// Rotating gradient orb
export const orbitSpin = (duration: number) => ({
  rotate: [0, 360],
  transition: { duration, repeat: Infinity, ease: "linear" },
});

// ── Hover helpers (use with whileHover prop) ──────────────

export const hoverLift = { y: -4, scale: 1.02 };
export const hoverScale = { scale: 1.06 };
export const hoverGlow = { boxShadow: "0 0 32px hsl(var(--primary) / 0.35)" };
export const tapPress = { scale: 0.96 };
