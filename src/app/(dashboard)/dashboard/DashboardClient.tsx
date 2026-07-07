"use client";

import { motion } from "framer-motion";
import {
  Code2,
  HelpCircle,
  CheckCircle2,
  Clock,
  Trophy,
  Mic,
  ArrowRight,
  Sparkles,
  TrendingUp,
  BookOpen,
  FileSearch,
} from "lucide-react";
import Link from "next/link";
import { GlassCard, AnimatedCounter } from "@/components/shared";
import { cn } from "@/lib/utils";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const labelIcons: Record<string, React.ComponentType<any>> = {
  "Technologies": Code2,
  "Total Questions": HelpCircle,
  "Questions Revised": CheckCircle2,
  "Due for Review": Clock,
  "Readiness Score": Trophy,
  "Mock Interviews": Mic,
};

interface StatItem {
  label: string;
  value: number;
  color: string;
  change: string;
  suffix?: string;
}

interface TechProgressItem {
  name: string;
  mastered: number;
  total: number;
  icon: string;
}

interface ActivityItem {
  action: string;
  item: string;
  tech: string;
  time: string;
  color: string;
}

interface DashboardClientProps {
  userName: string;
  stats: StatItem[];
  techProgress: TechProgressItem[];
  recentActivity: ActivityItem[];
  dueCount: number;
  weeks: { date: string; count: number }[][];
  resumeScore: { atsScore: number; createdAt: string } | null;
}

function getHeatmapColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-indigo-500/20";
  if (count <= 4) return "bg-indigo-500/40";
  if (count <= 6) return "bg-indigo-500/60";
  return "bg-indigo-500/80";
}

export default function DashboardClient({
  userName,
  stats,
  techProgress,
  recentActivity,
  dueCount,
  weeks,
  resumeScore,
}: DashboardClientProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* ── Hero / Welcome ───────────────────────────────── */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            Welcome Back, <span className="gradient-text">{userName}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            You have <span className="text-primary font-medium">{dueCount} questions</span> due for review today.
          </p>
        </div>
      </motion.div>

      {/* ── Stats Grid ───────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {stats.map((stat) => {
          const IconComponent = labelIcons[stat.label] || HelpCircle;
          return (
            <motion.div key={stat.label} variants={fadeInUp}>
              <GlassCard hover className="relative overflow-hidden group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-success" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-br shadow-lg",
                    stat.color,
                    "group-hover:scale-110 transition-transform"
                  )}>
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                </div>
                {/* Subtle gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-5 rounded-full bg-gradient-to-br from-current" />
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Resume Score Widget ───────────────────────────── */}
      {resumeScore && (
        <motion.div variants={fadeInUp}>
          <Link href="/resume-analyzer">
            <GlassCard hover className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <svg width="56" height="56" className="-rotate-90">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                      <circle
                        cx="28" cy="28" r="22"
                        fill="none"
                        stroke={resumeScore.atsScore >= 90 ? "#10b981" : resumeScore.atsScore >= 70 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${(resumeScore.atsScore / 100) * 138.2} 138.2`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black">{resumeScore.atsScore}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Resume Score</p>
                    <p className="text-xl font-bold">{resumeScore.atsScore} / 100</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Analyzed {resumeScore.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                    <FileSearch className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </GlassCard>
          </Link>
        </motion.div>
      )}

      {/* ── Middle Row: Tech Progress + Activity ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Technology Progress */}
        <motion.div variants={fadeInUp} className="lg:col-span-3">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Technology Progress</h2>
                <p className="text-sm text-muted-foreground">Questions mastered per technology</p>
              </div>
              <Link
                href="/technologies"
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
              >
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {techProgress.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No active workspaces. Get started by adding a technology!
              </div>
            ) : (
              <div className="space-y-4">
                {techProgress.map((tech) => {
                  const percentage = tech.total > 0 ? Math.round((tech.mastered / tech.total) * 100) : 0;
                  return (
                    <div key={tech.name} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tech.icon}</span>
                          <span className="text-sm font-medium">{tech.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {tech.mastered}/{tech.total} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full gradient-bg"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            {recentActivity.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No recent activity. Start studying to build your streak!
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className={cn("font-medium", activity.color)}>{activity.action}</span>{" "}
                        <span className="text-foreground">{activity.item}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{activity.tech}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Revision Heatmap ─────────────────────────────── */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Revision Activity</h2>
              <p className="text-sm text-muted-foreground">Your learning streak over the past year</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                {["bg-muted", "bg-indigo-500/20", "bg-indigo-500/40", "bg-indigo-500/60", "bg-indigo-500/80"].map((c) => (
                  <div key={c} className={cn("w-3 h-3 rounded-sm", c)} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-[3px] min-w-[720px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={cn(
                        "w-3 h-3 rounded-sm transition-colors",
                        getHeatmapColor(day.count)
                      )}
                      title={`${day.date}: ${day.count} revisions`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Quick Actions ────────────────────────────────── */}
      <motion.div variants={fadeInUp}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "Start Mock Interview",
              description: "Test your knowledge with AI",
              icon: Mic,
              href: "/mock-interview",
              gradient: "from-rose-500/10 to-pink-500/10",
              iconBg: "from-rose-500 to-pink-500",
            },
            {
              title: "Review Due Questions",
              description: `${dueCount} questions await revision`,
              icon: Clock,
              href: "/technologies",
              gradient: "from-amber-500/10 to-orange-500/10",
              iconBg: "from-amber-500 to-orange-500",
            },
            {
              title: "Explore Community",
              description: "Discover shared questions",
              icon: BookOpen,
              href: "/community",
              gradient: "from-blue-500/10 to-cyan-500/10",
              iconBg: "from-blue-500 to-cyan-500",
            },
          ].map((action) => (
            <Link key={action.title} href={action.href} className="cursor-pointer">
              <GlassCard hover className={cn("bg-gradient-to-br", action.gradient)}>
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-lg", action.iconBg)}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
