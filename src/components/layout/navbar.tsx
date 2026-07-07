"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, Search, Bell, X, Trash2, Check, Info, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

interface NavbarProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  onSearchClick?: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning";
}

export function Navbar({ onMenuClick, sidebarCollapsed, onSearchClick }: NavbarProps) {
  const { data: session } = useSession();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "Welcome to InterviewVault AI!",
      description: "Upload your resume in Settings to extract skills and generate tailored questions.",
      time: "Just now",
      read: false,
      type: "info",
    },
    {
      id: "2",
      title: "Review questions due",
      description: "You have questions waiting in your spaced repetition review queue today.",
      time: "1h ago",
      read: false,
      type: "warning",
    },
    {
      id: "3",
      title: "System Optimized",
      description: "AI generation models have been updated to flash-2.0 for faster responses.",
      time: "3h ago",
      read: true,
      type: "success",
    },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasUnread = notifications.some((n) => !n.read);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      // Also close user menu if click is outside it (simplified)
      if (!(event.target as Element).closest("#user-menu-container")) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  return (
    <header
      id="main-navbar"
      className={cn(
        "fixed top-0 right-0 z-[201] h-16",
        "bg-background/80 backdrop-blur-xl border-b border-border/50",
        "transition-all duration-300",
        sidebarCollapsed ? "lg:left-[72px]" : "lg:left-[260px]",
        "left-0"
      )}
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center">
            <div 
              onClick={onSearchClick}
              className="relative cursor-pointer group"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <input
                id="global-search"
                type="text"
                readOnly
                placeholder="Search questions, technologies..."
                className={cn(
                  "w-[280px] lg:w-[360px] rounded-xl border border-border bg-muted/50 pl-10 pr-16 py-2 text-sm cursor-pointer",
                  "focus:outline-none focus:ring-1 focus:ring-border",
                  "placeholder:text-muted-foreground/50",
                  "transition-all duration-200"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground select-none pointer-events-none">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-card font-mono">⌘</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-card font-mono">K</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search */}
          <button 
            onClick={onSearchClick}
            className="sm:hidden p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>


          {/* Notifications Container */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              id="notifications-btn"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-card/98 backdrop-blur-xl border border-border shadow-2xl p-4 overflow-hidden z-30"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/50">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <>
                          <button
                            onClick={markAllRead}
                            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Mark all as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={clearAll}
                            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                            title="Clear all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto mt-2 space-y-2 pr-1 scrollbar-thin">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                        <Bell className="h-8 w-8 opacity-40" />
                        <span>All caught up! No notifications.</span>
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const Icon = item.type === "warning" ? Clock : item.type === "success" ? Check : Info;
                        const iconColor = item.type === "warning" ? "text-amber-500 bg-amber-500/10" : item.type === "success" ? "text-emerald-500 bg-emerald-500/10" : "text-blue-500 bg-blue-500/10";
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-start gap-3 p-2.5 rounded-xl transition-all relative group",
                              item.read ? "bg-transparent opacity-70" : "bg-primary/5 border border-primary/10"
                            )}
                          >
                            <div className={cn("p-2 rounded-lg shrink-0", iconColor)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <p className={cn("text-xs font-bold leading-tight", item.read ? "text-muted-foreground" : "text-foreground")}>
                                {item.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                {item.description}
                              </p>
                              <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                                {item.time}
                              </span>
                            </div>
                            <div className="absolute right-2 top-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => toggleRead(item.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title={item.read ? "Mark as unread" : "Mark as read"}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeNotification(item.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ThemeToggle />

          {/* User Avatar & Menu */}
          <div className="relative" id="user-menu-container">
            <button
              id="user-menu"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-sm font-bold ml-1 shadow-lg shadow-primary/20 cursor-pointer overflow-hidden border border-border"
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-bg flex items-center justify-center">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-48 rounded-xl bg-card border border-border shadow-2xl overflow-hidden z-50 py-1"
                >
                  <div className="px-4 py-2 border-b border-border/50">
                    <p className="text-sm font-semibold truncate">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                  </div>
                  <Link 
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors font-medium w-full text-left"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
