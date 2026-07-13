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
  Menu,
  FileSearch,
  Users,
  Bookmark,
  BarChart3,
  Info,
  Settings,
  LogOut,
  X,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Static data (outside component to avoid re-creation) ──────────────────
const PRIMARY_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resume", href: "/resume-analyzer", icon: FileSearch },
] as const;

const SECONDARY_ITEMS = [
  { label: "Notes", href: "/notes", icon: StickyNote },
] as const;

const DRAWER_ITEMS = [
  { label: "Mock Interview", href: "/mock-interview", icon: Mic },
  { label: "Community", href: "/community", icon: Users },
  { label: "Saved Questions", href: "/saved", icon: Bookmark },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "About", href: "/about", icon: Info },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

// ── Helper: determine whether a given href matches current path ───────────
function getIsActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

// ── Individual nav tab ────────────────────────────────────────────────────
interface NavTabProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}

const NavTab = memo(function NavTab({ href, label, icon: Icon, active }: NavTabProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-col items-center justify-center w-14 h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
    >
      {/* Sliding active background pill */}
      {active && (
        <motion.div
          layoutId="mobile-nav-active-bg"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 400, damping: 32 }
          }
        />
      )}

      {/* Icon + optional glow */}
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : {
                scale: active ? 1.12 : 1,
                filter: active
                  ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))"
                  : "drop-shadow(0 0 0px transparent)",
              }
        }
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="relative z-10"
      >
        <Icon
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            active ? "text-primary" : "text-muted-foreground/70"
          )}
          strokeWidth={active ? 2.5 : 1.8}
        />
      </motion.div>

      {/* Label */}
      <motion.span
        animate={prefersReducedMotion ? {} : { opacity: active ? 1 : 0.6 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative z-10 text-[10px] mt-0.5 font-bold transition-colors duration-200",
          active ? "text-primary" : "text-muted-foreground/60"
        )}
      >
        {label}
      </motion.span>
    </Link>
  );
});

// ── More button ───────────────────────────────────────────────────────────
const MoreButton = memo(function MoreButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <button
      onClick={onClick}
      aria-label="More navigation options"
      aria-expanded={active}
      className="relative flex flex-col items-center justify-center w-14 h-full rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
    >
      {active && (
        <motion.div
          layoutId="mobile-nav-active-bg"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 400, damping: 32 }
          }
        />
      )}
      <motion.div
        animate={prefersReducedMotion ? {} : { scale: active ? 1.12 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="relative z-10"
      >
        <Menu
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            active ? "text-primary" : "text-muted-foreground/70"
          )}
          strokeWidth={active ? 2.5 : 1.8}
        />
      </motion.div>
      <span
        className={cn(
          "relative z-10 text-[10px] mt-0.5 font-bold transition-colors duration-200",
          active ? "text-primary" : "text-muted-foreground/60"
        )}
      >
        More
      </span>
    </button>
  );
});

// ── Center FAB (Technologies) ─────────────────────────────────────────────
const CenterFab = memo(function CenterFab({ active }: { active: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="relative flex flex-col items-center justify-center w-16">
      <motion.div
        whileTap={prefersReducedMotion ? {} : { scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="absolute -top-7"
      >
        <Link
          href="/technologies"
          aria-label="Technologies"
          aria-current={active ? "page" : undefined}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center border-4 border-background z-10 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-md",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-primary/90 text-primary-foreground hover:bg-primary"
          )}
        >
          <motion.div
            animate={
              prefersReducedMotion
                ? {}
                : {
                    scale: active ? 1.1 : 1,
                    rotate: active ? 8 : 0,
                  }
            }
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Code2 className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
          </motion.div>
        </Link>
      </motion.div>
      <span className="text-[10px] font-bold text-muted-foreground/60 absolute top-8 pointer-events-none">
        Topics
      </span>
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────
export const MobileBottomNav = memo(function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const isActive = useCallback(
    (href: string) => getIsActive(pathname, href),
    [pathname]
  );

  const drawerActive = drawerOpen;

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleSignOut = useCallback(async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  }, []);

  const adminDrawerItems = isAdmin
    ? [...DRAWER_ITEMS, { label: "Admin Panel", href: "/admin", icon: Shield } as const]
    : DRAWER_ITEMS;

  return (
    <>
      {/* ── Floating Bottom Nav Bar ── */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-5 left-4 right-4 h-16 z-[199] rounded-2xl border border-border/60 bg-card/85 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] flex items-center justify-between px-2 lg:hidden"
      >
        {/* Left tabs */}
        <div className="flex items-center justify-around flex-1">
          {PRIMARY_ITEMS.map((item) => (
            <NavTab
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
        </div>

        {/* Center elevated FAB */}
        <CenterFab active={isActive("/technologies")} />

        {/* Right tabs */}
        <div className="flex items-center justify-around flex-1">
          {SECONDARY_ITEMS.map((item) => (
            <NavTab
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
          <MoreButton
            active={drawerActive}
            onClick={() => setDrawerOpen((prev) => !prev)}
          />
        </div>
      </nav>

      {/* ── More Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black z-[299] lg:hidden"
              aria-hidden="true"
            />

            {/* Drawer sheet */}
            <motion.div
              key="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="More navigation options"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed bottom-0 left-0 right-0 z-[300] bg-card rounded-t-3xl border-t border-border/80 p-6 shadow-2xl flex flex-col max-h-[80vh] lg:hidden pb-10"
            >
              {/* Drag handle */}
              <div
                className="w-12 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mb-5 shrink-0"
                aria-hidden="true"
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-foreground">More</h3>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Grid of drawer nav items */}
              <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1 py-1 max-h-[50vh] custom-scrollbar mb-6">
                {adminDrawerItems.map((item, i) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 28 }}
                    >
                      <Link
                        href={item.href}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          active
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-muted/30 border-border hover:bg-muted/60"
                        )}
                      >
                        <Icon className="h-5 w-5 mb-1.5" />
                        <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                          {item.label}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer mt-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
