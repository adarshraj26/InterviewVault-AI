"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Code2,
  FileSearch,
  Layers,
  Database,
  Server,
  BarChart3,
  Users,
  Terminal,
  Zap,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Logo, ThemeToggle, Footer } from "@/components/shared";
import { cn } from "@/lib/utils";

// ── Animation Variants ─────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

// ── Topics Data for Accordion ────────────────────────────────
const TOPICS = [
  {
    id: "react",
    label: "React Ecosystem",
    description: "Component lifecycles, hooks, reconciliation, state flow, and RSCs.",
    count: "70+ Qs",
    icon: Layers,
    color: "bg-sky-500",
    glow: "shadow-[0_0_30px_-5px_rgba(14,165,233,0.4)]",
    bgHover: "hover:bg-sky-500/10",
  },
  {
    id: "javascript",
    label: "JavaScript Core",
    description: "Closures, execution contexts, async loops, and deep ESNext mechanics.",
    count: "80+ Qs",
    icon: Code2,
    color: "bg-yellow-500",
    glow: "shadow-[0_0_30px_-5px_rgba(234,179,8,0.4)]",
    bgHover: "hover:bg-yellow-500/10",
  },
  {
    id: "system-design",
    label: "System Design",
    description: "Scalable architectures, caching, microservices, and load balancing.",
    count: "35+ Qs",
    icon: BarChart3,
    color: "bg-orange-500",
    glow: "shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)]",
    bgHover: "hover:bg-orange-500/10",
  },
  {
    id: "node",
    label: "Node.js",
    description: "Event-driven architecture, streams, worker threads, and API design.",
    count: "40+ Qs",
    icon: Server,
    color: "bg-green-500",
    glow: "shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)]",
    bgHover: "hover:bg-green-500/10",
  },
  {
    id: "behavioral",
    label: "Behavioral & Culture",
    description: "Conflict resolution, engineering leadership, and communication.",
    count: "60+ Qs",
    icon: Users,
    color: "bg-teal-500",
    glow: "shadow-[0_0_30px_-5px_rgba(20,184,166,0.4)]",
    bgHover: "hover:bg-teal-500/10",
  },
];

// ── Interactive Terminal Hero Component ──────────────────────
function TerminalHero() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 1500); // Type question
    const timer2 = setTimeout(() => setStep(2), 3500); // Show AI thinking
    const timer3 = setTimeout(() => setStep(3), 5000); // Show AI response
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-border/50 bg-[#0d1117] shadow-2xl relative z-10 font-mono text-sm">
      {/* Terminal Header */}
      <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex-1 text-center text-xs font-medium text-white/40 flex items-center justify-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          interview-vault-ai.exe
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 min-h-[250px] flex flex-col gap-4">
        {/* User prompt */}
        <div className="flex gap-3 text-white/80">
          <span className="text-emerald-400 font-bold shrink-0">visitor@vault:~$</span>
          {step >= 1 ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="typing-animation overflow-hidden whitespace-nowrap"
              style={{ display: "inline-block" }}
            >
              explain react fiber reconciliation
            </motion.span>
          ) : (
            <span className="w-2 h-4 bg-white/60 animate-pulse inline-block align-middle" />
          )}
        </div>

        {/* AI Loading */}
        <AnimatePresence>
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-primary"
            >
              <Brain className="w-4 h-4 animate-pulse" />
              <span className="animate-pulse">Analyzing rendering pipeline...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Response */}
        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2 border-l-2 border-primary/50 pl-4 py-1"
          >
            <div className="text-primary font-bold flex items-center gap-2">
              <Zap className="w-4 h-4" /> AI Coach Feedback
            </div>
            <p className="text-white/70 leading-relaxed">
              React Fiber is the reimplementation of React's core algorithm. Its main goal is to enable
              incremental rendering—the ability to split rendering work into chunks and spread it out over multiple frames. 
              This prevents the main thread from blocking during complex tree reconciliations.
            </p>
            <div className="mt-2 text-emerald-400 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Passed: Excellent depth of knowledge!
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main About Page Component ────────────────────────────────
export default function AboutPage({ counts }: { counts: { react: number; javascript: number } }) {
  const [activeTopic, setActiveTopic] = useState<string>("react");

  const topicsWithData = TOPICS.map((topic) => {
    let countStr = "Coming Soon";
    let isComingSoon = true;
    if (topic.id === "react") {
      countStr = `${counts.react} Qs`;
      isComingSoon = false;
    } else if (topic.id === "javascript") {
      countStr = `${counts.javascript} Qs`;
      isComingSoon = false;
    }
    return { ...topic, countStr, isComingSoon };
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[140px] mix-blend-screen animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[140px] mix-blend-screen animate-pulse duration-[12000ms]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-grow pb-32">
        {/* ── Section 1: Hero Terminal ───────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-20 pb-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <div className="flex flex-col gap-6 text-center lg:text-left z-10">
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest w-fit mx-auto lg:mx-0">
                <Brain className="w-4 h-4 animate-pulse" /> AI-Powered Preparation
              </motion.div>
              <motion.h1 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Stop LeetCoding. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary">
                  Start Architecting.
                </span>
              </motion.h1>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                InterviewVault AI simulates the rigorous, real-world technical discussions you face in elite engineering rounds. No generic brain-teasers—just deep, first-principles engineering.
              </motion.p>
            </div>

            <motion.div variants={fadeInUp} className="relative z-10">
              {/* Glowing backplate for terminal */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-2xl rounded-full opacity-50 -z-10" />
              <TerminalHero />
            </motion.div>
          </motion.div>
        </div>

        {/* ── Section 2: Bento Box Mission ───────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The InterviewVault Advantage</h2>
            <p className="mt-4 text-muted-foreground">Why elite engineers use our platform to prepare.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 h-auto md:h-[500px]">
            {/* Box 1: The Main Mission (Col Span 2) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2 md:row-span-1 rounded-3xl bg-card/40 border border-border/50 backdrop-blur-md p-8 flex flex-col justify-center relative overflow-hidden group"
            >
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors duration-500" />
              <Brain className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-2">Deep Engineering Focus</h3>
              <p className="text-muted-foreground leading-relaxed max-w-xl relative z-10">
                We believe that modern interviews require more than just memorizing algorithms. We prepare you to discuss execution lifecycles, memory profiling, and architecture patterns with confidence.
              </p>
            </motion.div>

            {/* Box 2: The AI Coach (Col Span 1, Row Span 2) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-1 md:row-span-2 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 backdrop-blur-md p-8 flex flex-col items-center text-center relative overflow-hidden group"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              <div className="flex-1 flex flex-col items-center justify-center">
                <Zap className="w-16 h-16 text-primary mb-6 group-hover:scale-110 transition-transform duration-500" />
                <h3 className="text-2xl font-bold mb-4">Instant AI Feedback</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Submit your answers verbally or via text. Our LLM pipeline instantly analyzes your response for depth, accuracy, and communication style, providing targeted hints to improve your delivery.
                </p>
              </div>
            </motion.div>

            {/* Box 3: The Problem (DSA) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-1 md:row-span-1 rounded-3xl bg-rose-500/5 border border-rose-500/10 backdrop-blur-md p-8 flex flex-col justify-center"
            >
              <ShieldAlert className="w-8 h-8 text-rose-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Generic DSA Prep</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reversing linked lists rarely helps you explain React rendering bottlenecks or Node.js event streams. Stop preparing for the wrong test.
              </p>
            </motion.div>

            {/* Box 4: The Solution (Real World) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-1 md:row-span-1 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-md p-8 flex flex-col justify-center"
            >
              <Code2 className="w-8 h-8 text-emerald-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Real-World Architecting</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tackle questions actually asked by senior engineers at top tier companies. Design scalable systems and debug complex code.
              </p>
            </motion.div>
          </div>
        </div>

        {/* ── Section 3: Expanding Accordion Topics ───────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-24">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Curated Topics</h2>
            <p className="mt-4 text-muted-foreground">Interactive syllabus covering every engineering pillar.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 h-[500px] md:h-[400px]">
            {topicsWithData.map((topic) => {
              const isActive = activeTopic === topic.id;
              const Icon = topic.icon;

              return (
                <motion.div
                  key={topic.id}
                  layout
                  onClick={() => setActiveTopic(topic.id)}
                  className={cn(
                    "relative rounded-3xl border border-border/50 cursor-pointer overflow-hidden transition-all duration-500 flex flex-col",
                    isActive ? "bg-card flex-grow-[3]" : `flex-grow-[1] bg-card/40 ${topic.bgHover}`
                  )}
                  style={{ minWidth: isActive ? "250px" : "80px", flexBasis: 0 }}
                >
                  {/* Background Glow when active */}
                  {isActive && (
                    <div className={cn("absolute inset-0 opacity-10 transition-opacity", topic.color)} />
                  )}

                  {/* Top Right "Coming Soon" badge */}
                  {topic.isComingSoon && (
                    <div className="absolute top-4 right-4 z-30 pointer-events-none">
                      <span className="px-2 py-1 rounded bg-muted/80 text-[9px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-md border border-border/50">
                        Coming Soon
                      </span>
                    </div>
                  )}

                  {/* Icon Header */}
                  <div className="p-6 flex items-center justify-between md:justify-start gap-4">
                    <div className={cn("flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all", isActive ? topic.color : "bg-muted")}>
                      <Icon className={cn("w-6 h-6", isActive ? "text-white" : "text-muted-foreground")} />
                    </div>
                    {/* Horizontal title for mobile, or vertical/hidden for desktop when inactive */}
                    <div className={cn(
                      "font-bold whitespace-nowrap overflow-hidden transition-all",
                      isActive ? "text-xl md:opacity-100" : "text-base md:opacity-0 md:w-0"
                    )}>
                      {topic.label}
                    </div>
                  </div>

                  {/* Vertical Text for desktop inactive state */}
                  {!isActive && (
                    <div className="hidden md:flex flex-1 items-center justify-center pb-6">
                      <span className="font-bold text-muted-foreground tracking-widest whitespace-nowrap -rotate-90">
                        {topic.label}
                      </span>
                    </div>
                  )}

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-6 pt-0 mt-auto flex flex-col gap-4"
                      >
                        <p className="text-muted-foreground line-clamp-3">
                          {topic.description}
                        </p>
                        <div className="flex items-center justify-between mt-4">
                          <span className={cn("px-3 py-1 rounded-full text-xs font-bold text-white", topic.color)}>
                            {topic.countStr}
                          </span>
                          <Link
                            href={`/technologies/${topic.id}`}
                            className="w-10 h-10 rounded-full bg-foreground/10 hover:bg-foreground/20 flex items-center justify-center transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5 rotate-180 text-foreground" />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Section 4: Target Audience Scroll ───────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-24 border-t border-border/40">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Who is this for?</h2>
          </div>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <Brain className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-3xl bg-card/40 border border-border/50 backdrop-blur-md hover:border-primary/50 transition-colors">
                <span className="text-[10px] font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase mb-4 inline-block">
                  Senior Architects
                </span>
                <h3 className="font-bold text-xl mb-2 text-foreground">Master System Design</h3>
                <p className="text-sm text-muted-foreground">For veteran developers aiming for Staff/Principal roles. Focus on deep architecture, concurrent systems, and leadership.</p>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-yellow-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <Layers className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-3xl bg-card/40 border border-border/50 backdrop-blur-md hover:border-yellow-500/50 transition-colors">
                <span className="text-[10px] font-bold tracking-wider text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full uppercase mb-4 inline-block">
                  Mid-Level Engineers
                </span>
                <h3 className="font-bold text-xl mb-2 text-foreground">Advanced Paradigms</h3>
                <p className="text-sm text-muted-foreground">Level up your understanding of complex scopes, state flow, hooks optimization, and deeper framework internals.</p>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-purple-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <Code2 className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-3xl bg-card/40 border border-border/50 backdrop-blur-md hover:border-purple-500/50 transition-colors">
                <span className="text-[10px] font-bold tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full uppercase mb-4 inline-block">
                  Aspiring Developers
                </span>
                <h3 className="font-bold text-xl mb-2 text-foreground">First-Principles</h3>
                <p className="text-sm text-muted-foreground">Build a rock-solid foundation. Understand exactly how browsers render interfaces and how APIs communicate.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

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
            <div className="bg-gradient-to-r from-primary/80 to-blue-500/80 p-12 sm:p-16 text-center relative">
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
