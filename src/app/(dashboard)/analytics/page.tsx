"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Target, Brain, Award, Calendar } from "lucide-react";
import { GlassCard, AnimatedCounter } from "@/components/shared";
import { cn } from "@/lib/utils";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const analyticsStats = [
  { label: "Questions Completed", value: 247, icon: BarChart3, change: "+18 this week", color: "from-indigo-500 to-indigo-600" },
  { label: "Weekly Progress", value: 34, suffix: "%", icon: TrendingUp, change: "+8% vs last week", color: "from-emerald-500 to-emerald-600" },
  { label: "Readiness Score", value: 78, suffix: "%", icon: Target, change: "+5% this month", color: "from-purple-500 to-purple-600" },
  { label: "Mock Interview Avg", value: 82, suffix: "%", icon: Award, change: "Last 5 interviews", color: "from-amber-500 to-amber-600" },
];

const techReadiness = [
  { tech: "JavaScript", score: 85, icon: "🟨", strong: ["Closures", "Promises", "Event Loop"], weak: ["Generators", "Proxies"] },
  { tech: "React.js", score: 72, icon: "⚛️", strong: ["Hooks", "Components", "State"], weak: ["Fiber", "Concurrent Mode"] },
  { tech: "Node.js", score: 68, icon: "🟢", strong: ["Express", "Middleware"], weak: ["Streams", "Clustering"] },
  { tech: "Python", score: 55, icon: "🐍", strong: ["Basics", "OOP"], weak: ["Decorators", "Metaclasses", "AsyncIO"] },
  { tech: "SQL", score: 74, icon: "📊", strong: ["JOINs", "Indexes"], weak: ["Window Functions", "CTEs"] },
  { tech: "System Design", score: 40, icon: "🏗️", strong: ["REST APIs"], weak: ["Distributed Systems", "Caching", "Load Balancing"] },
];

const weeklyData = [
  { day: "Mon", questions: 8 },
  { day: "Tue", questions: 12 },
  { day: "Wed", questions: 6 },
  { day: "Thu", questions: 15 },
  { day: "Fri", questions: 10 },
  { day: "Sat", questions: 18 },
  { day: "Sun", questions: 5 },
];

const maxQuestions = Math.max(...weeklyData.map((d) => d.questions));

export default function AnalyticsPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8 max-w-6xl mx-auto">
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your progress and identify areas for improvement</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsStats.map((stat) => (
          <motion.div key={stat.label} variants={fadeInUp}>
            <GlassCard>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-success" />
                    {stat.change}
                  </p>
                </div>
                <div className={cn("p-2.5 rounded-xl bg-gradient-to-br", stat.color)}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Weekly Progress Chart */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Weekly Progress</h2>
              <p className="text-sm text-muted-foreground">Questions completed per day</p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{d.questions}</span>
                <motion.div
                  className="w-full rounded-t-lg gradient-bg min-h-[4px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.questions / maxQuestions) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                />
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Technology Readiness */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <h2 className="text-lg font-semibold mb-6">Technology Readiness</h2>
          <div className="space-y-6">
            {techReadiness.map((tech) => (
              <div key={tech.tech} className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 sm:w-40 shrink-0">
                  <span className="text-2xl">{tech.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{tech.tech}</p>
                    <p className={cn("text-xs font-medium",
                      tech.score >= 70 ? "text-green-500" : tech.score >= 50 ? "text-yellow-500" : "text-red-500"
                    )}>
                      {tech.score}% ready
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-bg"
                      initial={{ width: 0 }}
                      animate={{ width: `${tech.score}%` }}
                      transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-xs sm:w-72 shrink-0">
                  <div>
                    <span className="text-green-500 font-medium">Strong:</span>{" "}
                    <span className="text-muted-foreground">{tech.strong.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-red-500 font-medium">Weak:</span>{" "}
                    <span className="text-muted-foreground">{tech.weak.join(", ")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
