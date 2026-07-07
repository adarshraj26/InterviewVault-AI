"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Cpu, 
  Database, 
  Network, 
  ShieldAlert, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Flame,
  Award,
  BookOpen
} from "lucide-react";
import { GlassCard } from "@/components/shared";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";

const fadeInUp = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

interface SystemDesignResultsClientProps {
  interview: {
    id: string;
    technology: string;
    difficulty: string;
    question: string;
    userExplanation: string | null;
    canvasState: string | null;
    screenshot: string | null;
    score: number | null;
    completedAt: Date | null;

    // AI feedback fields
    scalability: string | null;
    highAvailability: string | null;
    faultTolerance: string | null;
    caching: string | null;
    databaseDesign: string | null;
    apiDesign: string | null;
    security: string | null;
    performance: string | null;
    diagramQuality: string | null;

    strengths: string[];
    weaknesses: string[];
    improvements: string[];
  };
}

export default function SystemDesignResultsClient({ interview }: SystemDesignResultsClientProps) {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>("scalability");
  const [viewTab, setViewTab] = useState<"diagram" | "explanation">("diagram");

  const score = interview.score || 0;

  // Audit categories list with associated icons and data fields
  const categories = [
    { key: "scalability", label: "Scalability", icon: Cpu, content: interview.scalability },
    { key: "highAvailability", label: "High Availability", icon: Network, content: interview.highAvailability },
    { key: "faultTolerance", label: "Fault Tolerance", icon: ShieldAlert, content: interview.faultTolerance },
    { key: "caching", label: "Caching Layer", icon: Flame, content: interview.caching },
    { key: "databaseDesign", label: "Database Design", icon: Database, content: interview.databaseDesign },
    { key: "apiDesign", label: "API Design", icon: Layers, content: interview.apiDesign },
    { key: "security", label: "Security & Compliance", icon: Award, content: interview.security },
    { key: "performance", label: "Performance & Latency", icon: Clock, content: interview.performance },
    { key: "diagramQuality", label: "Diagram Quality & Cleanliness", icon: BookOpen, content: interview.diagramQuality }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={stagger} 
      className="space-y-8 max-w-5xl mx-auto print:space-y-4 print:max-w-full"
    >
      {/* Header Bar */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/mock-interview")}
            className="p-2 rounded-xl border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span>System Design Evaluation</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Technology: {interview.technology} · Role level: {interview.difficulty}
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl border border-border bg-card/60 hover:bg-muted text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Download className="h-4 w-4" />
          Print / Export Report
        </button>
      </motion.div>

      {/* Main Score Widget Card */}
      <motion.div variants={fadeInUp}>
        <GlassCard className="relative overflow-hidden border border-border/50 shadow-2xl p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 gradient-bg opacity-5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative">
            {/* Score Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className="stroke-muted-foreground/10 fill-none"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="72"
                  cy="72"
                  r="64"
                  className={cn(
                    "fill-none transition-all duration-1000",
                    score >= 85 
                      ? "stroke-green-500" 
                      : score >= 70 
                        ? "stroke-yellow-500" 
                        : "stroke-red-500"
                  )}
                  strokeWidth="8"
                  strokeDasharray={402}
                  initial={{ strokeDashoffset: 402 }}
                  animate={{ strokeDashoffset: 402 - (402 * score) / 100 }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-foreground">{score}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Score</span>
              </div>
            </div>

            {/* Overall AI Assessment Summary */}
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                  score >= 85 
                    ? "bg-green-500/10 text-green-400 border-green-500/20" 
                    : score >= 70 
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" 
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {score >= 85 ? "Excellent System Architect" : score >= 70 ? "Competent Architecture Plan" : "Requires Improvements"}
                </span>
                <h2 className="text-xl font-bold mt-2">Evaluation Summary</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The architecture design has been reviewed by your AI system coach. Below are the key strengths and critical weaknesses identified inside the whiteboard drawing and explanation.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Strengths & Weaknesses Panel */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths Card */}
        <GlassCard className="border border-green-500/10 shadow-lg p-5">
          <h3 className="text-sm font-bold text-green-400 flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4" />
            Key Strengths
          </h3>
          <ul className="space-y-3">
            {interview.strengths.length === 0 ? (
              <li className="text-xs text-muted-foreground italic">No strengths highlighted.</li>
            ) : (
              interview.strengths.map((str, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed text-muted-foreground">
                  <span className="text-green-500 mt-0.5 font-bold shrink-0">✓</span>
                  <span>{str}</span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>

        {/* Weaknesses Card */}
        <GlassCard className="border border-red-500/10 shadow-lg p-5">
          <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-4">
            <XCircle className="h-4 w-4" />
            Critical Flaws
          </h3>
          <ul className="space-y-3">
            {interview.weaknesses.length === 0 ? (
              <li className="text-xs text-muted-foreground italic">No major flaws identified.</li>
            ) : (
              interview.weaknesses.map((weak, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed text-muted-foreground">
                  <span className="text-red-500 mt-0.5 font-bold shrink-0">✗</span>
                  <span>{weak}</span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>

        {/* Improvements Card */}
        <GlassCard className="border border-amber-500/10 shadow-lg p-5">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4" />
            Counter-Proposals
          </h3>
          <ul className="space-y-3">
            {interview.improvements.length === 0 ? (
              <li className="text-xs text-muted-foreground italic">No recommendations.</li>
            ) : (
              interview.improvements.map((imp, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed text-muted-foreground">
                  <span className="text-amber-500 mt-0.5 font-bold shrink-0">!</span>
                  <span>{imp}</span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>
      </motion.div>

      {/* Diagram and Written Explanation Preview Panel */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-6">
        <GlassCard className="border border-border/50 overflow-hidden flex flex-col p-0">
          {/* Tabs bar */}
          <div className="h-12 border-b border-border/40 bg-card/60 flex items-center justify-between px-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewTab("diagram")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold transition-all relative cursor-pointer",
                  viewTab === "diagram" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Architecture Diagram
                {viewTab === "diagram" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setViewTab("explanation")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold transition-all relative cursor-pointer",
                  viewTab === "explanation" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Written Explanation
                {viewTab === "explanation" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest hidden md:inline">
              Source Blueprint
            </span>
          </div>

          {/* Preview window content */}
          <div className="p-5 min-h-[300px] flex items-center justify-center bg-black/30">
            {viewTab === "diagram" ? (
              interview.screenshot ? (
                <div className="max-w-full max-h-[500px] rounded-xl overflow-hidden border border-border/40 bg-[#0b0f19] p-3 flex justify-center">
                  <img 
                    src={interview.screenshot} 
                    alt="System Architecture Diagram Screenshot" 
                    className="max-w-full max-h-[460px] object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No whiteboard diagram exported for this session.</p>
              )
            ) : (
              <div className="w-full text-left font-mono max-w-4xl mx-auto rounded-xl p-4 bg-black/40 border border-border/40 text-xs leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
                <MarkdownRenderer content={interview.userExplanation || "*No explanation provided.*"} />
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Expandable Category Audit List */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span>Category Audit Reports</span>
        </h3>

        <div className="space-y-2">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            const isExpanded = expandedSection === cat.key;
            
            if (!cat.content) return null;

            return (
              <div 
                key={cat.key}
                className={cn(
                  "rounded-2xl border transition-all overflow-hidden",
                  isExpanded ? "border-primary/40 bg-card/60" : "border-border/60 bg-card/25 hover:border-border hover:bg-card/40"
                )}
              >
                {/* Header toggle button */}
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : cat.key)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <CatIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{cat.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Content collapsible section */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-border/40 text-xs leading-relaxed text-muted-foreground font-medium">
                        <MarkdownRenderer content={cat.content} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
