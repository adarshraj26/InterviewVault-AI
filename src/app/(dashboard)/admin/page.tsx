"use client";

import { motion } from "framer-motion";
import { BarChart3, CreditCard, Eye, MoreHorizontal, Search, Shield, Users, Flag } from "lucide-react";
import { GlassCard, AnimatedCounter } from "@/components/shared";
import { cn } from "@/lib/utils";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const adminStats = [
  { label: "Total Users", value: 1247, icon: Users, color: "from-indigo-500 to-indigo-600" },
  { label: "Active Today", value: 342, icon: Eye, color: "from-emerald-500 to-emerald-600" },
  { label: "Public Questions", value: 3891, icon: BarChart3, color: "from-purple-500 to-purple-600" },
  { label: "AI Credits Used", value: 45230, icon: CreditCard, color: "from-amber-500 to-amber-600" },
];

const recentUsers = [
  { id: "1", name: "Priya Sharma", email: "priya@example.com", plan: "PRO", questions: 145, joined: "2 days ago" },
  { id: "2", name: "Rahul Mehta", email: "rahul@example.com", plan: "FREE", questions: 32, joined: "5 days ago" },
  { id: "3", name: "Sarah Lee", email: "sarah@example.com", plan: "PRO", questions: 267, joined: "1 week ago" },
  { id: "4", name: "Alex Kumar", email: "alex@example.com", plan: "FREE", questions: 18, joined: "2 weeks ago" },
  { id: "5", name: "Meera Jain", email: "meera@example.com", plan: "PRO", questions: 189, joined: "3 weeks ago" },
];

const flaggedContent = [
  { id: "1", question: "What is XSS and how to prevent it?", reporter: "User #234", reason: "Incorrect answer", tech: "Security" },
  { id: "2", question: "Explain microservices architecture", reporter: "User #567", reason: "Duplicate content", tech: "System Design" },
];

export default function AdminPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8 max-w-6xl mx-auto">
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Platform management and analytics</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map((stat) => (
          <motion.div key={stat.label} variants={fadeInUp}>
            <GlassCard>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1"><AnimatedCounter value={stat.value} /></p>
                </div>
                <div className={cn("p-2 rounded-xl bg-gradient-to-br", stat.color)}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Users Table */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Users</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search users..." className="rounded-xl border border-border bg-muted/50 pl-10 pr-4 py-2 text-sm w-[220px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Questions</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", user.plan === "PRO" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{user.questions}</td>
                    <td className="py-3 text-muted-foreground">{user.joined}</td>
                    <td className="py-3">
                      <button className="p-1 hover:bg-muted rounded-lg transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      {/* Flagged Content */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <Flag className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold">Flagged Content</h2>
            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-medium">{flaggedContent.length}</span>
          </div>
          <div className="space-y-3">
            {flaggedContent.map((item) => (
              <div key={item.id} className="flex items-center justify-between glass rounded-xl p-4">
                <div>
                  <p className="font-medium text-sm">{item.question}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{item.reporter}</span>
                    <span>·</span>
                    <span className="text-red-500">{item.reason}</span>
                    <span>·</span>
                    <span>{item.tech}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-medium hover:bg-green-500/20 transition-colors">Approve</button>
                  <button className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
