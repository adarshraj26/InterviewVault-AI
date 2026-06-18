"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  Code2,
  FileSearch,
  Map,
  Mic,
  RotateCcw,
  Sparkles,
  Star,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Logo, ThemeToggle, GlassCard, AnimatedCounter } from "@/components/shared";
import { FEATURES, FREE_FEATURES } from "@/constants";
import { cn } from "@/lib/utils";

// Icon map for dynamic rendering
const iconMap: Record<string, React.ElementType> = {
  FileSearch,
  Brain,
  Mic,
  RotateCcw,
  Map,
  Users,
};

// ── Animation Variants ─────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── Page Component ─────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[120px] animate-blob [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] animate-blob [animation-delay:4s]" />
        <div className="dot-pattern absolute inset-0 opacity-30" />
      </div>

      {/* ── Navbar ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass-strong">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo size="md" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#free" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                All Free
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="gradient-bg text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="relative pt-20 pb-32 sm:pt-32 sm:pb-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                AI-Powered Interview Preparation
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
            >
              Master Your{" "}
              <span className="gradient-text">Tech Interviews</span>
              <br />
              With AI Precision
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Upload your resume. Our AI extracts your skills, generates personalized questions,
              and coaches you through mock interviews — all in one beautiful workspace.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="gradient-bg text-white text-base font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/25 flex items-center gap-2 group"
              >
                Start Preparing Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#how-it-works"
                className="glass text-foreground text-base font-semibold px-8 py-3.5 rounded-xl hover:bg-muted transition-all flex items-center gap-2"
              >
                See How It Works
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeInUp}
              className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto"
            >
              {[
                { value: 5000, label: "Questions", suffix: "+" },
                { value: 50, label: "Technologies", suffix: "+" },
                { value: 1200, label: "Active Users", suffix: "+" },
                { value: 95, label: "Success Rate", suffix: "%" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image / Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="glass-strong rounded-2xl p-2 shadow-2xl">
              <div className="rounded-xl bg-card overflow-hidden border border-border">
                {/* Mock Dashboard Preview */}
                <div className="bg-gradient-to-b from-primary/5 to-transparent p-6 sm:p-8">
                  {/* Mock top bar */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="ml-4 h-6 w-64 rounded-md bg-muted" />
                  </div>
                  {/* Mock content */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {["Total Technologies", "Questions Mastered", "Readiness Score"].map(
                      (label, i) => (
                        <div
                          key={label}
                          className="glass rounded-xl p-4 border border-border/50"
                        >
                          <div className="text-xs text-muted-foreground mb-1">{label}</div>
                          <div className="text-2xl font-bold gradient-text">
                            {i === 0 ? "12" : i === 1 ? "247" : "87%"}
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full gradient-bg rounded-full"
                              style={{ width: `${[60, 75, 87][i]}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  {/* Mock sidebar hint + question cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1 hidden sm:flex flex-col gap-2">
                      {["JavaScript", "React.js", "Node.js", "Python", "SQL"].map((tech) => (
                        <div
                          key={tech}
                          className="text-xs py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground truncate"
                        >
                          {tech}
                        </div>
                      ))}
                    </div>
                    <div className="col-span-4 sm:col-span-3 flex flex-col gap-3">
                      {[
                        { q: "What is a Closure in JavaScript?", d: "Medium", t: "Advanced" },
                        { q: "Explain the Virtual DOM in React", d: "Easy", t: "Beginner" },
                        { q: "Event Loop and Async Patterns", d: "Hard", t: "Advanced" },
                      ].map((item) => (
                        <div
                          key={item.q}
                          className="glass rounded-lg p-3 flex items-center justify-between"
                        >
                          <span className="text-sm truncate mr-4">{item.q}</span>
                          <div className="flex gap-2 shrink-0">
                            <span
                              className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                item.d === "Easy"
                                  ? "bg-green-500/10 text-green-500"
                                  : item.d === "Medium"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-red-500/10 text-red-500"
                              )}
                            >
                              {item.d}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {item.t}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Glow underneath */}
            <div className="absolute -inset-4 -z-10 rounded-3xl gradient-bg opacity-10 blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────── */}
      <section id="features" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Powerful Features</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Ace Your Interview</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From resume parsing to AI-powered mock interviews, we've built every tool you need
              in one premium platform.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {FEATURES.map((feature) => {
              const Icon = iconMap[feature.icon] || Sparkles;
              return (
                <motion.div key={feature.title} variants={fadeInUp}>
                  <GlassCard hover className="h-full">
                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
              <Code2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Simple Process</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Get Started in{" "}
              <span className="gradient-text">3 Simple Steps</span>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload Your Resume",
                description:
                  "Simply upload your resume (PDF or DOCX). Our AI instantly extracts your skills, technologies, and frameworks.",
              },
              {
                step: "02",
                icon: Brain,
                title: "AI Generates Questions",
                description:
                  "Our AI creates personalized interview questions for each detected technology, organized by difficulty and frequency.",
              },
              {
                step: "03",
                icon: Star,
                title: "Practice & Master",
                description:
                  "Take mock interviews, use spaced repetition, and track your progress until you're interview-ready.",
              },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeInUp}>
                <div className="relative">
                  <div className="text-[120px] font-bold gradient-text opacity-10 absolute -top-10 -left-2 select-none leading-none">
                    {item.step}
                  </div>
                  <GlassCard className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                      <item.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </GlassCard>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 100% Free Section ─────────────────────────────── */}
      <section id="free" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">No Credit Card Required</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
              100%{" "}
              <span className="gradient-text">Free Forever</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-xl mx-auto">
              Every feature, every tool — completely free. No paywalls, no limits.
            </motion.p>
          </motion.div>

          <motion.div
            className="max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <div className="gradient-border glass-strong rounded-2xl p-8 shadow-2xl shadow-primary/10">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold gradient-text mb-2">$0</div>
                <p className="text-muted-foreground">Everything included, forever</p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="w-full gradient-bg text-white py-3 rounded-xl text-center font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25 block"
              >
                Get Started — It&apos;s Free
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="gradient-bg p-12 sm:p-16 text-center relative">
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to Ace Your Next Interview?
                </h2>
                <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
                  Join thousands of developers who are preparing smarter with AI.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all shadow-xl group"
                >
                  Get Started for Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" />
            <div className="flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} InterviewVault AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
