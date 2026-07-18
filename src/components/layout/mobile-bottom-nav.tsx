"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Code2,
  Mic,
  StickyNote,
  FileSearch,
  Users,
  Bookmark,
  BarChart3,
  Info,
  Settings,
  LogOut,
  X,
  Shield,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Static data ────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Home",       href: "/dashboard",       icon: LayoutDashboard },
  { label: "Resume",     href: "/resume-analyzer",  icon: FileSearch      },
  { label: "Topics",     href: "/technologies",     icon: Code2,  isFab: true },
  { label: "Notes",      href: "/notes",            icon: StickyNote      },
  { label: "More",       href: "#more",             icon: ChevronUp, isMore: true },
] as const;

const DRAWER_ITEMS = [
  { label: "Mock Interview",  href: "/mock-interview", icon: Mic      },
  { label: "Community",       href: "/community",      icon: Users    },
  { label: "Saved",           href: "/saved",          icon: Bookmark },
  { label: "Analytics",       href: "/analytics",      icon: BarChart3},
  { label: "About",           href: "/about",          icon: Info     },
  { label: "Settings",        href: "/settings",       icon: Settings },
] as const;

function getIsActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "#more") return false;
  return pathname.startsWith(href);
}

// ── Single nav pill button ─────────────────────────────────────────────────
interface NavPillProps {
  href:    string;
  label:   string;
  icon:    React.ElementType;
  active:  boolean;
  isFab?:  boolean;
  isMore?: boolean;
  onClick?: () => void;
  drawerOpen?: boolean;
}

const NavPill = memo(function NavPill({
  href, label, icon: Icon, active, isFab, isMore, onClick, drawerOpen,
}: NavPillProps) {
  const rm = useReducedMotion();

  /* ---------- FAB (center elevated button) ---------- */
  if (isFab) {
    return (
      <div className="relative flex flex-col items-center" style={{ width: 64 }}>
        {/* Breathing aura */}
        {!rm && (
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-5 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 blur-xl pointer-events-none"
          />
        )}
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className="relative z-10 -mt-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
        >
          <motion.div
            whileTap={rm ? {} : { scale: 0.88 }}
            animate={rm ? {} : { rotate: active ? 180 : 0, scale: active ? 1.08 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "shadow-[0_8px_30px_rgba(99,102,241,0.5)]",
              "bg-gradient-to-br from-violet-600 via-primary to-indigo-500",
              "border-[3px]",
              active ? "border-white/40" : "border-white/20"
            )}
          >
            <Icon className="h-6 w-6 text-white" strokeWidth={2} />
          </motion.div>
        </Link>
        <motion.span
          animate={rm ? {} : { opacity: active ? 1 : 0.5 }}
          className="mt-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 pointer-events-none"
        >
          {label}
        </motion.span>
      </div>
    );
  }

  /* ---------- "More" toggle button ---------- */
  if (isMore) {
    return (
      <button
        onClick={onClick}
        aria-label="More navigation options"
        aria-expanded={drawerOpen}
        className="relative flex flex-col items-center gap-1 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl select-none cursor-pointer"
      >
        {/* Active pill highlight */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              key="more-bg"
              layoutId="nav-active-pill"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-indigo-500/15 border border-primary/20"
            />
          )}
        </AnimatePresence>
        <motion.div
          whileTap={rm ? {} : { scale: 0.85 }}
          animate={rm ? {} : { rotate: drawerOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className={cn(
            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            drawerOpen
              ? "bg-primary/20 text-primary"
              : "bg-muted/30 text-muted-foreground/70"
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={drawerOpen ? 2.5 : 1.8} />
        </motion.div>
        <motion.span
          animate={rm ? {} : { opacity: drawerOpen ? 1 : 0.5 }}
          className={cn(
            "relative z-10 text-[9px] font-bold uppercase tracking-widest transition-colors",
            drawerOpen ? "text-primary" : "text-muted-foreground/60"
          )}
        >
          More
        </motion.span>
      </button>
    );
  }

  /* ---------- Normal nav button ---------- */
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-col items-center gap-1 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl select-none"
    >
      {/* Shared sliding pill highlight */}
      {active && (
        <motion.div
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-indigo-500/15 border border-primary/20"
          transition={rm ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
        />
      )}

      {/* Circle icon container */}
      <motion.div
        whileTap={rm ? {} : { scale: 0.82 }}
        animate={
          rm ? {} : {
            y: active ? -3 : 0,
            scale: active ? 1.1 : 1,
            filter: active
              ? "drop-shadow(0 4px 12px hsl(var(--primary) / 0.55))"
              : "drop-shadow(0 0 0px transparent)",
          }
        }
        transition={{ type: "spring", stiffness: 460, damping: 26 }}
        className={cn(
          "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200",
          active
            ? "bg-gradient-to-br from-primary/25 to-indigo-500/25 text-primary"
            : "bg-muted/20 text-muted-foreground/70"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />

        {/* Active glow ring around icon circle */}
        {active && !rm && (
          <motion.div
            layoutId="nav-icon-ring"
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
      </motion.div>

      {/* Label fades + lifts in when active */}
      <motion.span
        animate={rm ? {} : { opacity: active ? 1 : 0.45, y: active ? 0 : 2 }}
        transition={{ duration: 0.18 }}
        className={cn(
          "relative z-10 text-[9px] font-bold uppercase tracking-widest",
          active ? "text-primary" : "text-muted-foreground/55"
        )}
      >
        {label}
      </motion.span>

      {/* Tiny glowing dot below label for active state */}
      {active && (
        <motion.div
          layoutId="nav-active-dot"
          className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
          transition={rm ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </Link>
  );
});

// ── Main component ─────────────────────────────────────────────────────────
export const MobileBottomNav = memo(function MobileBottomNav() {
  const pathname   = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role    = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const isActive = useCallback(
    (href: string) => getIsActive(pathname, href),
    [pathname]
  );

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const handleSignOut = useCallback(async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  }, []);

  const adminDrawerItems = isAdmin
    ? [...DRAWER_ITEMS, { label: "Admin Panel", href: "/admin", icon: Shield } as const]
    : DRAWER_ITEMS;

  return (
    <>
      {/* ── Floating Bottom Nav ── */}
      <nav
        aria-label="Mobile navigation"
        className={cn(
          "fixed bottom-5 left-5 right-5 z-[199] lg:hidden",
          "h-[68px] rounded-[28px]",
          "bg-background/70 dark:bg-[#0C0C10]/70 backdrop-blur-2xl",
          "border border-white/10 dark:border-white/[0.06]",
          "shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
          "flex items-center justify-around px-2"
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isMore = "isMore" in item && item.isMore === true;
          const isFab  = "isFab"  in item && item.isFab  === true;
          return (
            <NavPill
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              isFab={isFab}
              isMore={isMore}
              drawerOpen={isMore ? drawerOpen : undefined}
              onClick={isMore ? () => setDrawerOpen((p) => !p) : undefined}
            />
          );
        })}
      </nav>

      {/* ── More Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[299] lg:hidden"
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              key="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="More navigation options"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 32, stiffness: 240 }}
              className={cn(
                "fixed bottom-0 left-0 right-0 z-[300] lg:hidden",
                "bg-background/90 dark:bg-[#0D0D12]/90 backdrop-blur-3xl",
                "rounded-t-[36px] border-t border-white/8 dark:border-white/[0.05]",
                "shadow-[0_-20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)_inset]",
                "p-6 pb-10 flex flex-col max-h-[88vh]"
              )}
            >
              {/* Drag Handle */}
              <div className="flex justify-center mb-5">
                <div className="w-10 h-1 rounded-full bg-white/15" aria-hidden="true" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                    All Pages
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-3 overflow-y-auto mb-5">
                {adminDrawerItems.map((item, i) => {
                  const active = isActive(item.href);
                  const Icon   = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1,   y: 0  }}
                      transition={{
                        delay: i * 0.04,
                        type: "spring",
                        stiffness: 360,
                        damping: 22,
                      }}
                    >
                      <Link
                        href={item.href}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex flex-col items-center justify-center gap-2.5 p-4 rounded-3xl",
                          "border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          active
                            ? "bg-gradient-to-br from-primary/15 to-indigo-500/15 border-primary/25 shadow-[0_0_20px_rgba(99,102,241,0.12)]"
                            : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/10"
                        )}
                      >
                        <motion.div
                          whileTap={{ scale: 0.85 }}
                          className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors",
                            active
                              ? "bg-gradient-to-br from-primary/30 to-indigo-500/30 text-primary shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
                              : "bg-white/[0.06] text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.8} />
                        </motion.div>
                        <span className={cn(
                          "text-[11px] font-bold leading-tight text-center line-clamp-1",
                          active ? "text-primary" : "text-muted-foreground"
                        )}>
                          {item.label}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Sign Out */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSignOut}
                aria-label="Sign out"
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 p-4 rounded-2xl",
                  "border border-destructive/15 bg-destructive/5 text-destructive",
                  "hover:bg-destructive hover:text-white",
                  "text-sm font-semibold transition-all cursor-pointer mt-auto",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                )}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
