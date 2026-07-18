"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * dashboard/template.tsx
 *
 * Framer Motion page transition — slides in from right + fades on every
 * route change inside the dashboard. Uses isMounted check to guarantee 100%
 * hydration match between server HTML and Framer Motion client styles.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-full">{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="h-full will-change-transform"
    >
      {children}
    </motion.div>
  );
}
