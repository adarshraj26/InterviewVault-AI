"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Code2,
  Mic,
  RotateCcw,
  Users,
  Bookmark,
  StickyNote,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  Info,
  LogOut,
  FileSearch,
} from "lucide-react";
import { Logo } from "@/components/shared";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Technologies", href: "/technologies", icon: Code2 },
  { label: "Resume Analyzer", href: "/resume-analyzer", icon: FileSearch },
  { label: "Mock Interview", href: "/mock-interview", icon: Mic },
  { label: "Community", href: "/community", icon: Users },
  { label: "Saved", href: "/saved", icon: Bookmark },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const bottomNavItems = [
  { label: "About", href: "/about", icon: Info },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Admin", href: "/admin", icon: Shield },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const visibleBottomItems = bottomNavItems.filter((item) => {
    if (item.label === "Admin") {
      return isAdmin;
    }
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + Collapse toggle */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-border/50">
        <Logo showText={!collapsed} size="sm" />
        {/* Mobile: close drawer */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Desktop: collapse/expand sidebar */}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="mb-2">
          {!collapsed && (
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Main
            </span>
          )}
        </div>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full gradient-bg"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border/50 py-4 px-3 space-y-1">
        {visibleBottomItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
        
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mt-1",
            "text-red-500 hover:bg-red-500/10"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>


    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        id="desktop-sidebar"
        className={cn(
          "fixed left-0 top-0 h-full z-30 hidden lg:block",
          "bg-card/80 backdrop-blur-xl border-r border-border/50",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            id="mobile-sidebar"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-[280px] z-[203] lg:hidden bg-card border-r border-border shadow-2xl"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
