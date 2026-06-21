"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  CreditCard,
  Eye,
  Search,
  Shield,
  Users,
  Flag,
  Sparkles,
  Check,
  Trash,
  EyeOff,
  UserCheck,
  Coins,
  Settings,
  Activity,
  Plus,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { GlassCard, AnimatedCounter } from "@/components/shared";
import { cn } from "@/lib/utils";
import {
  getAdminData,
  toggleUserRole,
  toggleUserPlan,
  adjustUserCredits,
  moderateQuestion,
  selfPromoteToAdmin,
} from "@/actions/admin";
import { toast } from "sonner";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "moderation" | "settings">("users");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // System Settings state mock for the Settings tab
  const [aiEnabled, setAiEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxFreeCredits, setMaxFreeCredits] = useState(50);

  const loadData = async () => {
    try {
      const res = await getAdminData();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admin telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelfPromote = async () => {
    setActionLoadingId("self-promote");
    toast.loading("Upgrading your role to admin...", { id: "self-promote" });
    try {
      const res = await selfPromoteToAdmin();
      if (res.error) {
        toast.error(res.error, { id: "self-promote" });
      } else {
        toast.success("Successfully upgraded to ADMIN! Refreshing page...", { id: "self-promote" });
        loadData();
      }
    } catch (err) {
      toast.error("Promotion failed.", { id: "self-promote" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleRole = async (userId: string) => {
    setActionLoadingId(userId + "-role");
    try {
      const res = await toggleUserRole(userId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Role updated to ${res.role}!`);
        loadData();
      }
    } catch (err) {
      toast.error("Failed to update role.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTogglePlan = async (userId: string) => {
    setActionLoadingId(userId + "-plan");
    try {
      const res = await toggleUserPlan(userId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Subscription updated to ${res.plan}!`);
        loadData();
      }
    } catch (err) {
      toast.error("Failed to update plan.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdjustCredits = async (userId: string, amount: number) => {
    setActionLoadingId(userId + "-credits");
    try {
      const res = await adjustUserCredits(userId, amount);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`User credits adjusted. New balance: ${res.credits}`);
        loadData();
      }
    } catch (err) {
      toast.error("Failed to adjust credits.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleModerateQuestion = async (questionId: string, action: "unpublish" | "delete") => {
    setActionLoadingId(questionId + "-mod");
    toast.loading(action === "unpublish" ? "Unpublishing question..." : "Deleting question...", {
      id: "moderate-action",
    });
    try {
      const res = await moderateQuestion(questionId, action);
      if (res.error) {
        toast.error(res.error, { id: "moderate-action" });
      } else {
        toast.success(`Question successfully ${action === "unpublish" ? "unpublished" : "deleted"}!`, {
          id: "moderate-action",
        });
        loadData();
      }
    } catch (err) {
      toast.error("Moderation failed.", { id: "moderate-action" });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading platform statistics...</p>
      </div>
    );
  }

  const { stats, users = [], communityQuestions = [], isSandbox } = data || {};

  // Filtering users
  const filteredUsers = users.filter(
    (u: any) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8 max-w-6xl mx-auto">
      
      {/* Sandbox Alert Banner */}
      {isSandbox && (
        <motion.div
          variants={fadeInUp}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/30 p-5 sm:p-6 shadow-xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-2xl rounded-full pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/20">
                <ShieldAlert className="h-5.5 w-5.5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-amber-400">Sandbox Demonstration Mode</h3>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Your current account has a standard <code className="text-amber-400 px-1 py-0.5 bg-amber-500/5 rounded font-mono">USER</code> role. 
                  Write operations (promoting roles, toggling billing plans, or deleting community questions) are safety-locked to prevent tampering.
                </p>
                <p className="text-[11px] text-amber-300/80 font-medium">
                  👉 Click the upgrade button to promote your account to <code className="font-mono text-amber-300">ADMIN</code> and unlock all moderation capabilities!
                </p>
              </div>
            </div>
            <button
              onClick={handleSelfPromote}
              disabled={actionLoadingId === "self-promote"}
              className="gradient-bg text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/25 disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              {actionLoadingId === "self-promote" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Upgrade Me to Admin
            </button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Admin Console</h1>
            <p className="text-muted-foreground text-sm">Real-time system telemetry, community moderation, and user management.</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-black/10 hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Stats
        </button>
      </motion.div>

      {/* Telemetry Metrics Grid */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "from-indigo-500 to-indigo-600 shadow-indigo-500/10" },
          { label: "Total Questions", value: stats?.totalQuestions || 0, icon: Activity, color: "from-purple-500 to-purple-600 shadow-purple-500/10" },
          { label: "Community Questions", value: stats?.publicQuestions || 0, icon: Eye, color: "from-emerald-500 to-emerald-600 shadow-emerald-500/10" },
          { label: "AI Credits Consumed", value: stats?.aiCreditsUsed || 0, icon: CreditCard, color: "from-amber-500 to-amber-600 shadow-amber-500/10" },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeInUp}>
            <GlassCard className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-xl rounded-full group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{stat.label}</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    <AnimatedCounter value={stat.value} />
                  </p>
                </div>
                <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-lg", stat.color)}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs Menu */}
      <motion.div variants={fadeInUp} className="flex border-b border-border/50">
        <div className="flex gap-2">
          {[
            { id: "users", label: "User Accounts", icon: Users },
            { id: "moderation", label: "Moderation Queue", icon: Flag },
            { id: "settings", label: "System Config", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Dynamic Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === "users" && (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <GlassCard>
              {/* Table Filter Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">User Directory</h2>
                  <p className="text-xs text-muted-foreground">Modify roles, subscription plans, and allocate credit balances.</p>
                </div>
                <div className="relative w-full sm:w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or email..."
                    className="rounded-xl border border-border bg-black/20 pl-10 pr-4 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
              </div>

              {/* Users Grid/Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/60">
                      <th className="pb-3 font-bold uppercase tracking-wider">User details</th>
                      <th className="pb-3 font-bold uppercase tracking-wider">Account Role</th>
                      <th className="pb-3 font-bold uppercase tracking-wider">Subscription</th>
                      <th className="pb-3 font-bold uppercase tracking-wider">AI Credits Balance</th>
                      <th className="pb-3 font-bold uppercase tracking-wider text-right">Moderator Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user: any) => (
                        <tr key={user.id} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                          {/* Name & Email */}
                          <td className="py-3.5">
                            <div className="space-y-0.5">
                              <p className="font-bold text-sm text-foreground">{user.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              user.role === "ADMIN"
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            )}>
                              {user.role}
                            </span>
                          </td>

                          {/* Plan */}
                          <td className="py-3.5 font-semibold text-foreground">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              user.plan === "PRO"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-slate-500/10 border-slate-500/20 text-muted-foreground"
                            )}>
                              {user.plan}
                            </span>
                          </td>

                          {/* Credits */}
                          <td className="py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-foreground font-bold">
                                <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                <span>{user.credits - user.creditsUsed} / {user.credits} remaining</span>
                              </div>
                              <div className="w-24 bg-black/35 rounded-full h-1.5 overflow-hidden border border-white/5">
                                <div
                                  className="gradient-bg h-full rounded-full"
                                  style={{ width: `${Math.min(100, (user.credits - user.creditsUsed) / user.credits * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Role */}
                              <button
                                onClick={() => handleToggleRole(user.id)}
                                disabled={actionLoadingId === user.id + "-role"}
                                className="px-2 py-1 rounded-lg border border-border bg-black/15 hover:bg-red-500/10 hover:border-red-500/30 text-muted-foreground hover:text-red-400 transition-all font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                title="Toggle Role (User / Admin)"
                              >
                                <UserCheck className="h-3 w-3" />
                                <span>Toggle Role</span>
                              </button>

                              {/* Toggle Plan */}
                              <button
                                onClick={() => handleTogglePlan(user.id)}
                                disabled={actionLoadingId === user.id + "-plan"}
                                className="px-2 py-1 rounded-lg border border-border bg-black/15 hover:bg-amber-500/10 hover:border-amber-500/30 text-muted-foreground hover:text-amber-400 transition-all font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                title="Toggle Plan (Free / Pro)"
                              >
                                <CreditCard className="h-3 w-3" />
                                <span>Toggle Plan</span>
                              </button>

                              {/* Add Credits */}
                              <button
                                onClick={() => handleAdjustCredits(user.id, 50)}
                                disabled={actionLoadingId === user.id + "-credits"}
                                className="px-2 py-1 rounded-lg border border-border bg-black/15 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-muted-foreground hover:text-emerald-400 transition-all font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                title="Grant 50 AI Credits"
                              >
                                <Plus className="h-3 w-3" />
                                <span>+50 Creds</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {activeTab === "moderation" && (
          <motion.div
            key="moderation-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <GlassCard>
              <div className="flex items-center gap-2 mb-6 border-b border-border/30 pb-4">
                <div className="p-2 rounded-xl bg-red-500/15 text-red-500 border border-red-500/20">
                  <Flag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Community Moderation Queue</h2>
                  <p className="text-xs text-muted-foreground">Approve, unpublish, or permanently delete publicly shared interview questions.</p>
                </div>
              </div>

              {communityQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Moderation Queue Clear!</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    No questions are currently queued. All publicly shared questions conform to default status standards.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {communityQuestions.map((item: any) => (
                    <motion.div
                      key={item.id}
                      layoutId={item.id}
                      className="glass rounded-2xl p-5 border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/20 transition-all relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        {/* Meta Tags info */}
                        <div className="flex flex-wrap gap-1.5 items-center justify-between">
                          <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                            {item.tech}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            ID: {item.id}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-extrabold text-foreground leading-snug">
                          {item.title}
                        </h4>

                        {/* Author */}
                        <div className="text-[10px] text-muted-foreground">
                          Shared by: <span className="font-semibold text-foreground">{item.authorName}</span> ({item.authorEmail})
                        </div>
                      </div>

                      {/* Controls Buttons */}
                      <div className="flex items-center gap-1.5 pt-3 border-t border-border/20 mt-2">
                        {/* Keep Public / Approve */}
                        <button
                          onClick={() => toast.success("Question approved in community library!")}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold hover:bg-emerald-500 hover:text-white transition-all cursor-pointer text-center"
                        >
                          Approve
                        </button>

                        {/* Unpublish */}
                        <button
                          onClick={() => handleModerateQuestion(item.id, "unpublish")}
                          disabled={actionLoadingId === item.id + "-mod"}
                          className="flex-1 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1"
                        >
                          <EyeOff className="h-3 w-3" />
                          Unpublish
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleModerateQuestion(item.id, "delete")}
                          disabled={actionLoadingId === item.id + "-mod"}
                          className="flex-1 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1"
                        >
                          <Trash className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            key="settings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-6 border-b border-border/30 pb-4">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500 border border-indigo-500/20">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Global System settings</h2>
                  <p className="text-xs text-muted-foreground">Adjust general application constraints and API defaults.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* AI Toggle */}
                <div className="flex items-center justify-between p-4 glass rounded-xl border border-border/60">
                  <div className="space-y-0.5 pr-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">AI Question Generation</h4>
                    <p className="text-xs text-muted-foreground">Allow users to utilize Gemini API prompts to automatically bootstrap question structures.</p>
                  </div>
                  <button
                    onClick={() => {
                      setAiEnabled(!aiEnabled);
                      toast.success(`AI Question Generation ${!aiEnabled ? "enabled" : "disabled"}`);
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0",
                      aiEnabled ? "bg-primary" : "bg-black/35 border border-border"
                    )}
                  >
                    <motion.div
                      layout
                      className="w-5 h-5 rounded-full bg-white shadow-md"
                      animate={{ x: aiEnabled ? 20 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Maintenance Mode */}
                <div className="flex items-center justify-between p-4 glass rounded-xl border border-border/60">
                  <div className="space-y-0.5 pr-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">System Maintenance Mode</h4>
                    <p className="text-xs text-muted-foreground">Toggle application-wide read-only flag for standard users during database updates.</p>
                  </div>
                  <button
                    onClick={() => {
                      setMaintenanceMode(!maintenanceMode);
                      toast.warning(`System Maintenance Mode ${!maintenanceMode ? "activated" : "deactivated"}`);
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0",
                      maintenanceMode ? "bg-red-500" : "bg-black/35 border border-border"
                    )}
                  >
                    <motion.div
                      layout
                      className="w-5 h-5 rounded-full bg-white shadow-md"
                      animate={{ x: maintenanceMode ? 20 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Default Free Credits */}
                <div className="p-4 glass rounded-xl border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Default Signup Credits</h4>
                      <p className="text-xs text-muted-foreground">Maximum free AI credits automatically granted to new free accounts.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMaxFreeCredits(prev => Math.max(10, prev - 10))}
                        className="w-8 h-8 rounded-lg bg-black/25 border border-border flex items-center justify-center hover:bg-muted font-extrabold text-foreground cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-primary w-10 text-center">{maxFreeCredits}</span>
                      <button
                        onClick={() => setMaxFreeCredits(prev => Math.min(200, prev + 10))}
                        className="w-8 h-8 rounded-lg bg-black/25 border border-border flex items-center justify-center hover:bg-muted font-extrabold text-foreground cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* System Logs preview */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent System Activity Logs</label>
                  <div className="rounded-xl border border-border/60 bg-black/40 p-4 font-mono text-[10px] text-slate-400 space-y-1.5 h-32 overflow-y-auto">
                    <div>[2026-06-21 03:08:44] INFO: Authorized token session for Priya Sharma.</div>
                    <div>[2026-06-21 03:09:12] SYSTEM: Revalidated path index: "/technologies".</div>
                    <div>[2026-06-21 03:10:02] GEMINI-API: Successfully generated 5 Javascript recursion questions.</div>
                    <div className="text-amber-400">[2026-06-21 03:10:15] WARN: User #234 flagged question ID "cl_xss_2" for inaccuracy.</div>
                    <div>[2026-06-21 03:11:00] INFO: Re-indexed community search indices.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
