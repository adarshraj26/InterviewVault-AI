"use client";

import { motion, useInView } from "framer-motion";
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
  BookOpen,
  FlaskConical,
  BarChart3,
  Clock,
  ChevronRight,
  Layers,
  Database,
  Server,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Logo, ThemeToggle, AnimatedCounter, Footer } from "@/components/shared";
import { FREE_FEATURES } from "@/constants";
import { cn } from "@/lib/utils";

// ── Animation Variants ─────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeInUpTransition = { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const };

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── Topic Cards Data ────────────────────────────────────────
const TOPICS = [
  {
    id: "javascript",
    label: "JavaScript Core",
    description: "Closures, hoisting, event loop, promises, async/await, prototypes, and advanced ESNext features.",
    count: "80+",
    icon: Code2,
    color: "#eab308",
    glow: "from-yellow-500/20",
    iconColor: "text-yellow-400",
    borderColor: "group-hover:border-yellow-500/30",
    bgColor: "group-hover:bg-yellow-500/5",
  },
  {
    id: "react",
    label: "React & Frontend",
    description: "Component patterns, hooks lifecycle, rendering optimization, state management, and React 19.",
    count: "70+",
    icon: Layers,
    color: "#38bdf8",
    glow: "from-sky-500/20",
    iconColor: "text-sky-400",
    borderColor: "group-hover:border-sky-500/30",
    bgColor: "group-hover:bg-sky-500/5",
  },
  {
    id: "typescript",
    label: "TypeScript Systems",
    description: "Generics, conditional types, mapped types, utility types, structural compatibility, and decorators.",
    count: "50+",
    icon: FileSearch,
    color: "#3b82f6",
    glow: "from-blue-500/20",
    iconColor: "text-blue-400",
    borderColor: "group-hover:border-blue-500/30",
    bgColor: "group-hover:bg-blue-500/5",
  },
  {
    id: "node",
    label: "Node.js & Backend",
    description: "Event-driven architecture, streams, worker threads, Express middleware, REST API design, and security.",
    count: "40+",
    icon: Server,
    color: "#22c55e",
    glow: "from-green-500/20",
    iconColor: "text-green-400",
    borderColor: "group-hover:border-green-500/30",
    bgColor: "group-hover:bg-green-500/5",
  },
  {
    id: "databases",
    label: "Databases & SQL",
    description: "Query optimization, indexing strategies, ACID properties, NoSQL vs SQL, ORMs, and schema design.",
    count: "45+",
    icon: Database,
    color: "#a855f7",
    glow: "from-purple-500/20",
    iconColor: "text-purple-400",
    borderColor: "group-hover:border-purple-500/30",
    bgColor: "group-hover:bg-purple-500/5",
  },
  {
    id: "system-design",
    label: "System Design",
    description: "Scalable architectures, load balancing, caching, microservices, event sourcing, and distributed systems.",
    count: "35+",
    icon: BarChart3,
    color: "#f97316",
    glow: "from-orange-500/20",
    iconColor: "text-orange-400",
    borderColor: "group-hover:border-orange-500/30",
    bgColor: "group-hover:bg-orange-500/5",
  },
];

// ── Featured Questions ─────────────────────────────────────
const FEATURED_QUESTIONS = [
  {
    category: "JavaScript",
    categoryColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    difficulty: "Medium",
    difficultyColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    title: "What is the Event Loop and how does it work?",
    snippet: "The event loop is JavaScript's core concurrency model. It continuously checks the call stack and task queue...",
    readTime: "8 min read",
    glowColor: "#eab308",
  },
  {
    category: "React",
    categoryColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    difficulty: "Hard",
    difficultyColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    title: "Explain React reconciliation and the Fiber architecture",
    snippet: "React Fiber is the reimplementation of the React reconciler. It allows incremental rendering — splitting work into chunks...",
    readTime: "12 min read",
    glowColor: "#38bdf8",
  },
  {
    category: "TypeScript",
    categoryColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    difficulty: "Hard",
    difficultyColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    title: "Conditional types and the infer keyword in TypeScript",
    snippet: "Conditional types allow you to express non-uniform type mappings. The infer keyword lets you capture type variables...",
    readTime: "10 min read",
    glowColor: "#3b82f6",
  },
];

// ── How It Works Steps ─────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Upload,
    iconColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    title: "Upload Your Resume",
    description: "Simply upload your PDF or DOCX resume. Our AI instantly extracts skills, technologies, and experience levels to build your personalized workspace.",
  },
  {
    step: "02",
    icon: Brain,
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    title: "AI Generates Questions",
    description: "Our AI creates personalized interview questions for each detected technology, organized by difficulty, frequency, and interview stage.",
  },
  {
    step: "03",
    icon: Star,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    title: "Practice & Master",
    description: "Take AI-powered mock interviews, use spaced repetition flashcards, and track your readiness score until you're confidently interview-ready.",
  },
];

// ── Page Component ─────────────────────────────────────────
export default function LandingPage() {
  const featuresRef = useRef(null);
  const topicsRef = useRef(null);
  const featuredRef = useRef(null);
  const isTopicsInView = useInView(topicsRef, { once: true, margin: "-80px" });
  const isFeaturedInView = useInView(featuredRef, { once: true, margin: "-80px" });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ── Mesh Background ───────────────────────────────── */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[140px] animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-[140px] animate-blob [animation-delay:2s]" />
        <div className="absolute bottom-1/4 left-1/2 w-[400px] h-[400px] rounded-full bg-accent/4 blur-[120px] animate-blob [animation-delay:4s]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--muted-foreground) / 0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ── Announcement Banner ───────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-primary/8 via-secondary/5 to-primary/8 border-b border-primary/10 py-2 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-muted-foreground flex-wrap font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block animate-pulse">⚡</span>
            <span>New: Smart DOCX/PDF importers & Spaced Repetition Practice Mode are now live!</span>
          </span>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-200 group/cta cursor-pointer"
          >
            <span>Start Practicing Free</span>
            <span className="transform group-hover/cta:translate-x-0.5 transition-transform duration-150">→</span>
          </Link>
        </div>
      </div>

      {/* ── Navbar ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/70 border-b border-border/60 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo size="md" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer py-1.5">
                Features
              </a>
              <a href="#topics" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer py-1.5">
                Topics
              </a>
              <Link href="/about" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer py-1.5">
                About
              </Link>
              <Link href="/dashboard" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer py-1.5">
                Dashboard
              </Link>
              <a href="#how-it-works" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer py-1.5">
                How It Works
              </a>
              <Link href="/contact" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer py-1.5">
                Contact
              </Link>
              <a href="#free" className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer py-1.5 flex items-center gap-1.5">
                Pricing
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Free</span>
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
                Sign In
              </Link>
              <Link
                href="/register"
                className="gradient-bg text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25 flex items-center gap-1.5 group"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="relative pt-24 pb-32 sm:pt-32 sm:pb-44 flex flex-col items-center justify-center text-center overflow-hidden min-h-[75vh]">
        {/* Hero radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/8 dark:bg-primary/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card/80 border border-border text-xs font-semibold text-muted-foreground shadow-sm transition-colors backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                The Ultimate Interview Preparation Platform
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeInUp}
              className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent"
            >
              Prep Smarter,{" "}
              <br className="sm:hidden" />
              Not Harder.
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeInUp}
              className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              AI-powered interview preparation with personalized question banks, mock interviews, spaced repetition flashcards, and expert code explanations — all in one beautiful workspace.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0">
              {/* Primary CTA with spinning border */}
              <Link href="/register" className="group relative w-full sm:w-auto">
                <button className="relative w-full sm:w-auto px-8 py-4 gradient-bg text-white font-semibold rounded-xl text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/30 cursor-pointer overflow-hidden active:scale-95">
                  {/* Spinning conic-gradient border on hover */}
                  <div className="absolute inset-0 rounded-xl p-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden pointer-events-none z-0">
                    <div
                      className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite]"
                      style={{ background: "conic-gradient(from 0deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)" }}
                    />
                    <div className="absolute inset-[1.5px] gradient-bg rounded-[10.5px]" />
                  </div>
                  <span className="relative z-10 flex items-center gap-2">
                    Start Preparing Free
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>

              {/* Secondary CTA */}
              <Link href="#topics">
                <button className="w-full sm:w-auto px-8 py-4 bg-card/60 border border-border hover:border-foreground/30 text-foreground hover:bg-muted/50 font-semibold rounded-xl text-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer backdrop-blur-sm">
                  Explore Topics
                </button>
              </Link>
            </motion.div>

            {/* Stats Row */}
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
                  <div className="text-2xl sm:text-3xl font-extrabold gradient-text">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Popular Topics Grid ────────────────────────────── */}
      <section id="topics" className="py-24 relative border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14" ref={topicsRef}>
            <motion.h2
              variants={fadeInUp}
              initial="hidden"
              animate={isTopicsInView ? "visible" : "hidden"}
              className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground"
            >
              Popular Topics
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              initial="hidden"
              animate={isTopicsInView ? "visible" : "hidden"}
              transition={{ delay: 0.1 }}
              className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed"
            >
              Explore curated learning tracks covering core requirements of high-quality engineering interviews.
            </motion.p>
          </div>

          {/* Topic Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate={isTopicsInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {TOPICS.map((topic) => {
              const Icon = topic.icon;
              const isComingSoon = topic.id !== "javascript";
              return (
                <motion.div key={topic.id} variants={fadeInUp}>
                  <Link
                    href={isComingSoon ? "#" : "/register"}
                    className={cn(
                      "group relative flex flex-col h-full rounded-2xl p-[1.5px] overflow-hidden transition-all duration-300 block",
                      isComingSoon ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                    )}
                  >
                    {/* Static border */}
                    <div className="absolute inset-0 rounded-2xl border border-border group-hover:opacity-0 transition-opacity duration-300 pointer-events-none z-20" />
                    {/* Spinning conic-gradient border on hover */}
                    {!isComingSoon && (
                      <div
                        className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `conic-gradient(from 0deg, transparent 35%, ${topic.color} 50%, transparent 65%)` }}
                      />
                    )}
                    {/* Card body */}
                    <div className="relative flex flex-col h-full bg-card/60 backdrop-blur-md rounded-[14.5px] p-6 z-10 hover:bg-card/80 transition-colors">
                      <div className="flex items-center justify-between mb-5">
                        <div
                          className={cn(
                            "flex items-center justify-center w-11 h-11 rounded-xl bg-background border border-border transition-all duration-300 group-hover:scale-105",
                            topic.borderColor,
                            topic.bgColor,
                            topic.iconColor
                          )}
                        >
                          <Icon className={cn("h-5 w-5", topic.iconColor)} />
                        </div>
                        <div className="flex items-center gap-2">
                          {!isComingSoon ? (
                            <span className="text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full border bg-muted/50 text-muted-foreground border-border uppercase">
                              {topic.count} Questions
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1.25 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Coming Soon
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-grow">
                        <h3 className="text-base font-bold text-foreground tracking-tight">{topic.label}</h3>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>{isComingSoon ? "Coming Soon" : "Explore Questions"}</span>
                        {!isComingSoon && (
                          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          {/* View All Button */}
          <div className="mt-12 text-center">
            <Link href="/register">
              <button className="px-8 py-3.5 bg-card/60 border border-border hover:border-foreground/30 text-foreground hover:bg-muted/50 font-semibold rounded-xl text-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-sm backdrop-blur-sm">
                Explore All Topics
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Questions ────────────────────────────── */}
      <section className="py-24 relative border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div ref={featuredRef} className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="max-w-xl">
              <motion.h2
                variants={fadeInUp}
                initial="hidden"
                animate={isFeaturedInView ? "visible" : "hidden"}
                className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2"
              >
                <Star className="h-6 w-6 text-amber-400" />
                Featured Questions
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                initial="hidden"
                animate={isFeaturedInView ? "visible" : "hidden"}
                transition={{ delay: 0.1 }}
                className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed"
              >
                Hand-crafted, deeply detailed explanations for the most commonly asked interview questions.
              </motion.p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-foreground hover:opacity-80 group/btn transition-all self-start md:self-auto"
            >
              <span>View All Questions</span>
              <ArrowRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          {/* Featured Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate={isFeaturedInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {FEATURED_QUESTIONS.map((q, i) => {
              const isComingSoon = q.category.toLowerCase() !== "javascript";
              return (
                <motion.div key={i} variants={fadeInUp}>
                  <Link
                    href={isComingSoon ? "#" : "/register"}
                    className={cn(
                      "group relative flex flex-col justify-between h-full rounded-2xl p-[1.5px] overflow-hidden transition-all duration-300 block",
                      isComingSoon ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                    )}
                  >
                    <div className="absolute inset-0 rounded-2xl border border-border group-hover:opacity-0 transition-opacity duration-300 pointer-events-none z-20" />
                    {!isComingSoon && (
                      <div
                        className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `conic-gradient(from 0deg, transparent 35%, ${q.glowColor} 50%, transparent 65%)` }}
                      />
                    )}
                    <div className="relative flex flex-col justify-between h-full bg-card/60 backdrop-blur-md rounded-[14.5px] p-6 z-10 hover:bg-card/80 transition-colors min-h-[220px]">
                      {/* Top row */}
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase", q.categoryColor)}>
                              {q.category}
                            </span>
                            <span className={cn("text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase", q.difficultyColor)}>
                              {q.difficulty}
                            </span>
                          </div>
                          {isComingSoon && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-foreground/95 transition-colors line-clamp-2 leading-snug">
                          {q.title}
                        </h3>
                        <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {q.snippet}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{q.readTime}</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                          <span>{isComingSoon ? "Coming Soon" : "View Solution"}</span>
                          {!isComingSoon && (
                            <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform duration-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────── */}
      <section id="features" className="py-24 relative border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card/80 border border-border text-xs font-semibold text-muted-foreground mb-6 backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Powerful Features
              </span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Ace Your Interview</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground">
              From AI resume parsing to mock interviews, we've built every tool you need in one beautiful workspace.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {[
              { icon: FileSearch, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", title: "AI Resume Parser", desc: "Upload your resume and our AI extracts skills, technologies, and experience levels to build your personalized workspace." },
              { icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", title: "Smart Question Bank", desc: "Curated interview questions organized by technology, difficulty, and frequency. Add your own or let AI generate them." },
              { icon: Mic, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", title: "Mock Interviews", desc: "Practice with AI-powered mock interviews. Get instant scoring on accuracy, completeness, and technical communication." },
              { icon: RotateCcw, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", title: "Spaced Repetition", desc: "Never forget what you've learned. Our smart flashcard system schedules reviews at optimal intervals using the SM-2 algorithm." },
              { icon: BookOpen, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", title: "Markdown Q&A Editor", desc: "Write and format interview answers in GitHub README-style markdown. Beautiful rendered articles with syntax-highlighted code." },
              { icon: Users, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", title: "Community Library", desc: "Share questions with the community. Like, bookmark, and save the best ones to your private vault." },
            ].map((f) => {
              const FIcon = f.icon;
              return (
                <motion.div key={f.title} variants={fadeInUp}>
                  <div className="group relative rounded-2xl p-[1.5px] overflow-hidden transition-all duration-300 h-full">
                    <div className="absolute inset-0 rounded-2xl border border-border group-hover:opacity-0 transition-opacity duration-300 pointer-events-none z-10" />
                    <div
                      className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: "conic-gradient(from 0deg, transparent 35%, rgb(var(--primary)) 50%, transparent 65%)" }}
                    />
                    <div className="relative bg-card/60 backdrop-blur-sm rounded-[14.5px] p-6 z-10 h-full hover:bg-card/80 transition-colors">
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-4 border", f.bg, f.border)}>
                        <FIcon className={cn("h-5 w-5", f.color)} />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-24 relative border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card/80 border border-border text-xs font-semibold text-muted-foreground mb-6 backdrop-blur-md">
                <Code2 className="h-3.5 w-3.5 text-primary" />
                Simple Process
              </span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
              Get Started in{" "}
              <span className="gradient-text">3 Simple Steps</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground">
              From zero to interview-ready in minutes. No credit card required.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {HOW_IT_WORKS.map((item, idx) => {
              const SIcon = item.icon;
              return (
                <motion.div key={item.step} variants={fadeInUp} className="relative">
                  {/* Connector line */}
                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-full w-8 h-px bg-gradient-to-r from-border to-transparent z-10 -ml-4" />
                  )}
                  <div className="relative group rounded-2xl p-[1.5px] overflow-hidden transition-all duration-300">
                    <div className="absolute inset-0 rounded-2xl border border-border group-hover:opacity-0 transition-opacity duration-300 pointer-events-none z-10" />
                    <div
                      className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: "conic-gradient(from 0deg, transparent 35%, rgb(var(--primary)) 50%, transparent 65%)" }}
                    />
                    <div className="relative bg-card/60 backdrop-blur-sm rounded-[14.5px] p-7 z-10 hover:bg-card/80 transition-colors">
                      {/* Step number watermark */}
                      <div className="text-[80px] font-black gradient-text opacity-8 absolute -top-4 -right-2 select-none leading-none pointer-events-none">
                        {item.step}
                      </div>
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-5 border", item.bgColor, item.borderColor)}>
                        <SIcon className={cn("h-6 w-6", item.iconColor)} />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── 100% Free Section ─────────────────────────────── */}
      <section id="free" className="py-24 relative border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-6">
                <Check className="h-3.5 w-3.5" />
                No Credit Card Required
              </span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
              100%{" "}
              <span className="gradient-text">Free Forever</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground">
              Every feature, every tool — completely free. No paywalls, no limits, no hidden charges.
            </motion.p>
          </motion.div>

          <motion.div
            className="max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeInUp}
          >
            {/* Pricing card with spinning border */}
            <div className="group relative rounded-2xl p-[1.5px] overflow-hidden">
              <div className="absolute inset-0 rounded-2xl border border-border pointer-events-none z-10" />
              <div
                className="absolute inset-[-1000%] animate-[spin_6s_linear_infinite]"
                style={{ background: "conic-gradient(from 0deg, transparent 35%, rgb(var(--primary)) 48%, transparent 62%)" }}
              />
              <div className="relative bg-card/80 backdrop-blur-xl rounded-[14.5px] p-8 sm:p-10 z-10 shadow-2xl shadow-primary/5">
                <div className="text-center mb-8">
                  <div className="text-6xl font-black gradient-text mb-2">$0</div>
                  <p className="text-muted-foreground text-sm">Everything included, forever</p>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="group/cta w-full gradient-bg text-white py-3.5 rounded-xl text-center font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  Get Started — It&apos;s Free
                  <ArrowRight className="h-4 w-4 group-hover/cta:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="py-24 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="gradient-bg p-12 sm:p-16 text-center relative">
              <div className="absolute inset-0 bg-black/20" />
              {/* Glow blobs */}
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/90 mb-6">
                  <Sparkles className="h-3.5 w-3.5" />
                  Join thousands of developers
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
                  Ready to Ace Your Next Interview?
                </h2>
                <p className="text-white/75 text-base max-w-xl mx-auto mb-8 leading-relaxed">
                  Build your personalized AI question bank, practice spaced repetition flashcards, and walk into every interview with confidence.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-2xl group"
                >
                  Get Started for Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
