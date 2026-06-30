"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  FileText,
  Search,
  Pencil,
  Briefcase,
  Users,
  History,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  ArrowUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Tag,
  BookOpen,
  Loader2,
  X,
  Upload,
} from "lucide-react";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { analyzeResumeWithAI } from "@/actions/resume";
import { useRouter } from "next/navigation";
import ResumeUpload from "./ResumeUpload";

// ── Types ────────────────────────────────────────────────────

interface SectionScores {
  technical: number;
  projects: number;
  experience: number;
  education: number;
  formatting: number;
  readability: number;
  grammar: number;
  keywords: number;
  recruiterAppeal: number;
}

interface Analysis {
  id: string;
  resumeId: string;
  userId: string;
  atsScore: number;
  sectionScores: SectionScores;
  summary: string;
  missingKeywords: { keyword: string; reason: string }[];
  grammarIssues: { original: string; suggestion: string; type: string }[];
  actionVerbs: { weak: string; strong: string; reason: string }[];
  bulletPoints: { original: string; improved: string }[];
  projectAnalysis: { name: string; score: number; suggestions: string[] }[];
  recruiterFeedback: string[];
  formattingTips: string[];
  skillCategories: {
    languages: string[];
    frameworks: string[];
    libraries: string[];
    databases: string[];
    cloud: string[];
    tools: string[];
    versionControl: string[];
    testing: string[];
  };
  candidateName: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  resumeId: string;
  atsScore: number;
  createdAt: string;
  fileName: string;
  sectionScores: SectionScores;
}

interface Props {
  analysis: Analysis;
  history: HistoryItem[];
  resumeFileName: string;
  resumeId: string;
}

// ── Helpers ─────────────────────────────────────────────────

function getAtsColor(score: number) {
  if (score >= 90) return { text: "text-emerald-400", bg: "bg-emerald-500", stroke: "#10b981" };
  if (score >= 70) return { text: "text-amber-400", bg: "bg-amber-500", stroke: "#f59e0b" };
  return { text: "text-red-400", bg: "bg-red-500", stroke: "#ef4444" };
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

const SECTION_LABELS: Record<keyof SectionScores, string> = {
  technical: "Technical Skills",
  projects: "Projects",
  experience: "Experience",
  education: "Education",
  formatting: "Formatting",
  readability: "Readability",
  grammar: "Grammar & Writing",
  keywords: "Keywords",
  recruiterAppeal: "Recruiter Appeal",
};

const TAB_ITEMS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "keywords", label: "Keywords", icon: Search },
  { id: "writing", label: "Writing", icon: Pencil },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "recruiter", label: "Recruiter", icon: Users },
  { id: "history", label: "History", icon: History },
];

// ── Circular ATS Score ───────────────────────────────────────

function ATSCircle({ score }: { score: number }) {
  const { text, stroke } = getAtsColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Outer subtle glow */}
      <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full scale-75 animate-pulse" />
      <svg width="150" height="150" className="-rotate-90 filter drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]">
        {/* Track */}
        <circle cx="75" cy="75" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        {/* Glow behind the active stroke */}
        <motion.circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="opacity-30 blur-[2px]"
        />
        {/* Active Stroke */}
        <motion.circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className={cn("text-5xl font-extrabold tracking-tight font-sans", text)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">ATS Rating</span>
      </div>
    </div>
  );
}

// ── Score Bar ────────────────────────────────────────────────

function ScoreBar({ label, score, delay = 0 }: { label: string; score: number; delay?: number }) {
  // Determine gradient color classes based on score
  const getGradient = (s: number) => {
    if (s >= 85) return "from-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
    if (s >= 70) return "from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]";
    return "from-red-500 to-rose-600 shadow-[0_0_12px_rgba(239,68,68,0.3)]";
  };

  return (
    <div className="group space-y-2 p-2 rounded-xl hover:bg-muted/30 transition-all duration-300">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
        <span className="text-sm font-black font-mono">{score}%</span>
      </div>
      <div className="h-3 rounded-full bg-black/40 border border-white/5 overflow-hidden p-[1px]">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", getGradient(score))}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Skill Tag ────────────────────────────────────────────────

function SkillTag({ name, color }: { name: string; color: string }) {
  return (
    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border", color)}>
      {name}
    </span>
  );
}

// ── JD Match Modal ───────────────────────────────────────────

function JDMatchModal({ onClose }: { onClose: () => void }) {
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    matchScore: number;
    missingSkills: string[];
    missingKeywords: string[];
    suggestions: string[];
  } | null>(null);

  const handleAnalyze = async () => {
    if (!jd.trim()) {
      toast.error("Please paste a job description");
      return;
    }
    setLoading(true);
    // Simulate JD match (real implementation would call a server action)
    await new Promise((r) => setTimeout(r, 1500));
    setResult({
      matchScore: Math.floor(Math.random() * 30) + 55,
      missingSkills: ["Docker", "Kubernetes", "AWS Lambda"],
      missingKeywords: ["microservices", "CI/CD", "agile", "REST API"],
      suggestions: [
        "Add experience with containerization technologies",
        "Highlight cloud deployment experience",
        "Include CI/CD pipeline keywords",
      ],
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Job Description Match</h2>
            <p className="text-sm text-muted-foreground">Compare your resume against a job listing</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-48 p-4 rounded-xl bg-black/30 border border-border text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full gradient-bg text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : "Analyze Match"}
              </button>
            </>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-6">
                <ATSCircle score={result.matchScore} />
                <div className="space-y-1">
                  <p className="text-2xl font-bold">Resume Match</p>
                  <p className="text-sm text-muted-foreground">
                    Your resume matches {result.matchScore}% of the job requirements
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">Missing Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Missing Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingKeywords.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-medium">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold">Suggestions</p>
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {s}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Try another job description
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function ResumeAnalyzerClient({ analysis, history, resumeFileName, resumeId }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [showJdModal, setShowJdModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const atsColors = getAtsColor(analysis.atsScore);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    toast.loading("Re-analyzing resume...", { id: "reanalyze" });
    const res = await analyzeResumeWithAI(resumeId, "");
    setReanalyzing(false);
    if ("error" in res) {
      toast.error(res.error ?? "Analysis failed", { id: "reanalyze" });
    } else {
      toast.success(`New ATS Score: ${res.atsScore}/100`, { id: "reanalyze" });
      router.refresh();
    }
  };

  const handleDownload = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const sections = analysis.sectionScores as SectionScores;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Resume Analysis Report — ${resumeFileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; color: #6c63ff; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    h2 { font-size: 16px; font-weight: 700; color: #374151; margin-top: 24px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
    .ats-score { font-size: 48px; font-weight: 900; color: ${analysis.atsScore >= 90 ? "#10b981" : analysis.atsScore >= 70 ? "#f59e0b" : "#ef4444"}; }
    .score-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .score-label { width: 160px; font-size: 13px; color: #374151; flex-shrink: 0; }
    .score-bar-bg { flex: 1; height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: 4px; background: #6c63ff; }
    .score-num { width: 40px; text-align: right; font-size: 13px; font-weight: 700; color: #374151; }
    .summary { background: #f9fafb; border-left: 4px solid #6c63ff; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.6; color: #374151; margin-bottom: 16px; }
    .keyword-pill { display: inline-block; background: #fee2e2; color: #991b1b; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; margin: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-weight: 700; color: #374151; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; vertical-align: top; }
    .recruiter-item { display: flex; gap: 8px; margin-bottom: 8px; font-size: 14px; color: #374151; }
    .recruiter-item::before { content: "→"; color: #6c63ff; font-weight: 700; flex-shrink: 0; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Resume Analysis Report</h1>
  <p class="subtitle">File: ${resumeFileName} · Analyzed: ${new Date(analysis.createdAt).toLocaleDateString()}</p>

  <h2>ATS Score</h2>
  <div class="ats-score">${analysis.atsScore} <span style="font-size:24px;color:#6b7280">/ 100</span></div>

  <h2>AI Summary</h2>
  <div class="summary">${analysis.summary}</div>

  <h2>Score Breakdown</h2>
  ${Object.entries(sections).map(([k, v]) => `
    <div class="score-row">
      <span class="score-label">${SECTION_LABELS[k as keyof SectionScores] || k}</span>
      <div class="score-bar-bg"><div class="score-bar-fill" style="width:${v}%"></div></div>
      <span class="score-num">${v}%</span>
    </div>`).join("")}

  <h2>Missing Keywords</h2>
  ${analysis.missingKeywords.map((k) => `<span class="keyword-pill">${k.keyword}</span>`).join("")}
  ${analysis.missingKeywords.length === 0 ? "<p style='color:#6b7280;font-size:13px'>No critical keywords missing.</p>" : ""}

  <h2>Grammar & Writing Issues</h2>
  ${analysis.grammarIssues.length > 0 ? `
  <table>
    <thead><tr><th>Issue Type</th><th>Original</th><th>Suggestion</th></tr></thead>
    <tbody>
      ${analysis.grammarIssues.map((g) => `<tr><td>${g.type}</td><td>${g.original}</td><td>${g.suggestion}</td></tr>`).join("")}
    </tbody>
  </table>` : "<p style='color:#6b7280;font-size:13px'>No grammar issues detected.</p>"}

  <h2>Improved Bullet Points</h2>
  ${analysis.bulletPoints.length > 0 ? `
  <table>
    <thead><tr><th>Original</th><th>Improved</th></tr></thead>
    <tbody>
      ${analysis.bulletPoints.map((b) => `<tr><td>${b.original}</td><td>${b.improved}</td></tr>`).join("")}
    </tbody>
  </table>` : "<p style='color:#6b7280;font-size:13px'>No bullet point suggestions.</p>"}

  <h2>Recruiter Feedback</h2>
  ${analysis.recruiterFeedback.map((f) => `<div class="recruiter-item">${f}</div>`).join("")}

  <h2>Formatting Tips</h2>
  ${analysis.formattingTips.map((t) => `<div class="recruiter-item">${t}</div>`).join("")}

</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart2 className="h-7 w-7 text-primary" />
            Resume Analyzer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <FileText className="h-3.5 w-3.5 inline mr-1" />
            {resumeFileName} ·{" "}
            <span className="text-primary/80">
              Analyzed {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowJdModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium transition-all"
          >
            <Search className="h-4 w-4 text-primary" />
            JD Match
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium transition-all"
          >
            <Download className="h-4 w-4 text-primary" />
            Download Report
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Upload className="h-4 w-4" />
            New Resume
          </button>
        </div>
      </motion.div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] relative"
            >
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="absolute top-4 right-4 z-10 p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="p-2 pt-6">
                <ResumeUpload />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-white/5">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-300 relative group",
              activeTab === tab.id
                ? "gradient-bg text-white shadow-lg shadow-primary/20 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5"
            )}
          >
            <tab.icon className={cn("h-4 w-4 transition-transform duration-300 group-hover:scale-110", activeTab === tab.id ? "text-white" : "text-primary/70")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* ATS Score Card */}
            <GlassCard className="flex flex-col items-center justify-center gap-4 py-8 border border-primary/10 bg-gradient-to-b from-card to-card/60 relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resume ATS Rating</p>
              <ATSCircle score={analysis.atsScore} />
              <div className={cn("px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border", 
                analysis.atsScore >= 90 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                analysis.atsScore >= 70 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : 
                "bg-red-500/10 border-red-500/20 text-red-400"
              )}>
                {analysis.atsScore >= 90 ? "🟢 Excellent Profile" : analysis.atsScore >= 70 ? "🟡 Good Coverage" : "🔴 Needs Optimization"}
              </div>
              {analysis.candidateName && (
                <p className="text-sm font-semibold text-foreground text-center mt-2 border-t border-white/5 pt-4 w-full">
                  {analysis.candidateName}
                  {analysis.candidateEmail && <><br /><span className="text-xs text-muted-foreground font-normal">{analysis.candidateEmail}</span></>}
                </p>
              )}
            </GlassCard>

            {/* Section Scores */}
            <GlassCard className="lg:col-span-2 space-y-4 border border-white/5 bg-gradient-to-br from-card to-card/50">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-base font-bold">Category Scorecard</h2>
                <span className="text-xs text-muted-foreground font-medium">9 Key Metrics Evaluated</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {Object.entries(analysis.sectionScores).map(([key, score], i) => (
                  <ScoreBar
                    key={key}
                    label={SECTION_LABELS[key as keyof SectionScores] || key}
                    score={score}
                    delay={i * 0.05}
                  />
                ))}
              </div>
            </GlassCard>

            {/* AI Summary */}
            <GlassCard className="lg:col-span-3 border border-white/5 relative overflow-hidden bg-gradient-to-r from-card to-card/50">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl gradient-bg shrink-0 shadow-md shadow-primary/20">
                  <Star className="h-5 w-5 text-white animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold">Executive Evaluation</h2>
                  <p className="text-sm text-foreground/80 leading-relaxed font-sans">{analysis.summary}</p>
                </div>
              </div>
            </GlassCard>

            {/* Skills Breakdown */}
            <GlassCard className="lg:col-span-3 border border-primary/10 relative overflow-hidden bg-gradient-to-br from-card to-card/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-border pb-3">
                <Tag className="h-5 w-5 text-primary animate-pulse" />
                Technical Skill Mapping
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Programming Languages", items: analysis.skillCategories?.languages || [], color: "border-blue-500/20 bg-blue-500/5 text-blue-300 hover:bg-blue-500/10", labelColor: "text-blue-400" },
                  { label: "Frameworks & Runtimes", items: analysis.skillCategories?.frameworks || [], color: "border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10", labelColor: "text-purple-400" },
                  { label: "Databases & Storage", items: analysis.skillCategories?.databases || [], color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10", labelColor: "text-emerald-400" },
                  { label: "Cloud Services & DevOps", items: [...(analysis.skillCategories?.cloud || []), ...(analysis.skillCategories?.tools || [])], color: "border-amber-500/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10", labelColor: "text-amber-400" },
                  { label: "Libraries & Utils", items: analysis.skillCategories?.libraries || [], color: "border-pink-500/20 bg-pink-500/5 text-pink-300 hover:bg-pink-500/10", labelColor: "text-pink-400" },
                  { label: "Version Control & Testing", items: [...(analysis.skillCategories?.versionControl || []), ...(analysis.skillCategories?.testing || [])], color: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/10", labelColor: "text-cyan-400" },
                ].filter(g => g.items.length > 0).map((group, groupIdx) => (
                  <motion.div 
                    key={group.label} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIdx * 0.05 }}
                    className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3 hover:border-primary/20 hover:bg-black/30 transition-all duration-300 group"
                  >
                    <p className={cn("text-xs font-black uppercase tracking-widest border-b border-white/5 pb-2 flex items-center justify-between", group.labelColor)}>
                      {group.label}
                      <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{group.items.length}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {group.items.map((s) => (
                        <span 
                          key={s} 
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-default",
                            group.color
                          )}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ── Tab: Keywords ─────────────────────────────────── */}
        {activeTab === "keywords" && (
          <motion.div
            key="keywords"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <GlassCard className="border border-red-500/10 relative overflow-hidden bg-gradient-to-br from-card to-card/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 shrink-0">
                  <Search className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Missing Core Keywords</h2>
                  <p className="text-xs text-muted-foreground">{analysis.missingKeywords.length} critical skills and industry terminology absent from your resume</p>
                </div>
              </div>

              {analysis.missingKeywords.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
                  <p className="font-bold text-lg text-foreground">Optimized Keyword Density</p>
                  <p className="text-sm mt-1 text-muted-foreground">No critical technical terms or keywords are missing from your resume!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.missingKeywords.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex flex-col justify-between p-5 rounded-2xl bg-black/30 border border-white/5 hover:border-red-500/30 hover:bg-black/40 transition-all duration-300"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider">
                            {item.keyword}
                          </span>
                          <span className="text-[10px] text-red-500/80 font-bold bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/10">High Priority</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">{item.reason}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* ── Tab: Writing ──────────────────────────────────── */}
        {activeTab === "writing" && (
          <motion.div
            key="writing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Grammar & Writing Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Action Verbs */}
              <div className="space-y-6 lg:col-span-1">
                {/* Action Verbs Card */}
                <GlassCard className="border border-primary/10 relative overflow-hidden h-full">
                  <div className="flex items-center gap-3 mb-6 border-b border-border pb-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                      <ArrowUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Action Verbs</h2>
                      <p className="text-xs text-muted-foreground">Upgrade weak or repetitive verbs</p>
                    </div>
                  </div>
                  {analysis.actionVerbs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                      <p className="font-medium">Strong action verbs throughout!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analysis.actionVerbs.map((v, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2 hover:border-primary/20 transition-all duration-300"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="line-through text-muted-foreground text-xs font-mono bg-white/5 px-2 py-0.5 rounded-md">{v.weak}</span>
                            <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-emerald-400 font-extrabold text-xs font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{v.strong}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{v.reason}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Right Column: Grammar Issues + Bullet Points */}
              <div className="space-y-6 lg:col-span-2">
                {/* Grammar Issues Card */}
                <GlassCard className="border border-amber-500/10">
                  <div className="flex items-center gap-3 mb-6 border-b border-border pb-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Grammar & Syntax Errors</h2>
                      <p className="text-xs text-muted-foreground">Fix formatting, syntax, and grammatical issues</p>
                    </div>
                  </div>
                  {analysis.grammarIssues.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                      <p className="font-bold text-foreground">Clean Copy</p>
                      <p className="text-xs text-muted-foreground mt-1">No syntax or grammar errors detected!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analysis.grammarIssues.map((issue, i) => (
                        <div key={i} className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3 hover:border-amber-500/20 transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">{issue.type}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                              <p className="text-[10px] text-red-400 font-black uppercase tracking-wider mb-1">Original Text</p>
                              <p className="text-foreground/80 line-through decoration-red-500/30">{issue.original}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider mb-1">Corrected Suggestion</p>
                              <p className="text-foreground font-medium">{issue.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>

                {/* Bullet Point Rewrites */}
                <GlassCard className="border border-primary/10">
                  <div className="flex items-center gap-3 mb-6 border-b border-border pb-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                      <Pencil className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Bullet Point Enhancements</h2>
                      <p className="text-xs text-muted-foreground">High-impact rewrites with action verbs and structure</p>
                    </div>
                  </div>
                  {analysis.bulletPoints.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                      <p className="font-medium">Bullet points look excellent!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {analysis.bulletPoints.map((bp, i) => (
                        <div key={i} className="rounded-xl border border-white/5 bg-black/20 overflow-hidden hover:border-primary/20 transition-all duration-300">
                          <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Suggestion #{i+1}</span>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground font-bold shrink-0">BEFORE</span>
                              <p className="italic leading-relaxed">{bp.original}</p>
                            </div>
                            <div className="flex items-start gap-2.5 text-sm text-foreground">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold shrink-0 text-xs">AFTER</span>
                              <p className="font-medium leading-relaxed">{bp.improved}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Projects ─────────────────────────────────── */}
        {activeTab === "projects" && (
          <motion.div
            key="projects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {analysis.projectAnalysis.length === 0 ? (
              <GlassCard>
                <div className="text-center py-10 text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No projects found in resume</p>
                  <p className="text-sm mt-1">Add a Projects section to get detailed feedback.</p>
                </div>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.projectAnalysis.map((project, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <GlassCard hover className="h-full border border-white/5 bg-gradient-to-br from-card to-card/50 flex flex-col justify-between p-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10 pointer-events-none group-hover:bg-primary/10 transition-all duration-300" />
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{project.name}</h3>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Project Scorecard</span>
                          </div>
                          <span className={cn(
                            "text-3xl font-black font-mono",
                            project.score >= 80 ? "text-emerald-400" : project.score >= 60 ? "text-amber-400" : "text-red-400"
                          )}>
                            {project.score}%
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-black/40 border border-white/5 overflow-hidden p-[1px]">
                          <motion.div
                            className={cn("h-full rounded-full bg-gradient-to-r", 
                              project.score >= 80 ? "from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" :
                              project.score >= 60 ? "from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]" :
                              "from-red-500 to-rose-600 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${project.score}%` }}
                            transition={{ duration: 1.2, delay: 0.2 }}
                          />
                        </div>
                        <div className="space-y-2.5 pt-2 border-t border-white/5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recruiter Suggestions</p>
                          {project.suggestions.map((s, j) => (
                            <div key={j} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <p className="leading-relaxed">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Tab: Recruiter ────────────────────────────────── */}
        {activeTab === "recruiter" && (
          <motion.div
            key="recruiter"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Recruiter Feedback */}
            <GlassCard className="border border-primary/10 relative overflow-hidden bg-gradient-to-br from-card to-card/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                  <Users className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Recruiter Insights</h2>
                  <p className="text-xs text-muted-foreground">Targeted feedback based on corporate recruiter expectations</p>
                </div>
              </div>

              {analysis.recruiterFeedback.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium">No negative feedback recorded!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.recruiterFeedback.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-black/20 border border-white/5 hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary">
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{f}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Formatting Tips */}
            <GlassCard className="border border-amber-500/10 relative overflow-hidden bg-gradient-to-br from-card to-card/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <BookOpen className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Structure & Formatting</h2>
                  <p className="text-xs text-muted-foreground">Ensure layout matches industry standards for ATS parser compatibility</p>
                </div>
              </div>

              {analysis.formattingTips.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium">Formatting looks pristine!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.formattingTips.map((t, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-black/20 border border-white/5 hover:border-amber-500/20 transition-all duration-300"
                    >
                      <div className="flex-shrink-0 p-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{t}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* ── Tab: History ──────────────────────────────────── */}
        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold">Analysis History</h2>
                  <p className="text-xs text-muted-foreground">{history.length} analyses recorded</p>
                </div>
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition-all"
                >
                  {reanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Re-analyze
                </button>
              </div>

              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No previous analyses found.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item, i) => {
                    const prev = history[i + 1];
                    const delta = prev ? item.atsScore - prev.atsScore : null;
                    const colors = getAtsColor(item.atsScore);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all",
                          item.id === analysis.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-muted/20 hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("text-2xl font-black", colors.text)}>{item.atsScore}</div>
                          <div>
                            <p className="text-sm font-medium">{item.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                              {item.id === analysis.id && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold">Latest</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {delta !== null && (
                          <div className={cn(
                            "text-sm font-bold px-2 py-1 rounded-lg",
                            delta > 0 ? "text-emerald-400 bg-emerald-500/10" : delta < 0 ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-muted"
                          )}>
                            {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JD Match Modal */}
      <AnimatePresence>
        {showJdModal && <JDMatchModal onClose={() => setShowJdModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
