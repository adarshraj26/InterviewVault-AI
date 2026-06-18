"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Code2,
  Copy,
  Plus,
  Search,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Trash,
  Pencil,
  Globe,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { getTechnologyBySlug, updateTechnology } from "@/actions/technologies";
import { createQuestion, generateAIQuestions, deleteQuestion, updateQuestion, toggleQuestionPublic } from "@/actions/questions";
import { toast } from "sonner";
import { TECH_ICONS } from "@/constants";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const difficultyColors = {
  EASY: "bg-green-500/10 text-green-500",
  MEDIUM: "bg-yellow-500/10 text-yellow-500",
  HARD: "bg-red-500/10 text-red-500",
};

const statusColors = {
  NOT_STARTED: "bg-slate-400/10 text-slate-400",
  LEARNING: "bg-blue-500/10 text-blue-500",
  REVISED_ONCE: "bg-yellow-500/10 text-yellow-500",
  MASTERED: "bg-green-500/10 text-green-500",
};

const statusLabels = {
  NOT_STARTED: "Not Started",
  LEARNING: "Learning",
  REVISED_ONCE: "Revised Once",
  MASTERED: "Mastered",
};

const languageNames: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  java: "Java",
  cpp: "C++",
};

function highlightCode(code: string, language: string): string {
  if (!code) return "";
  
  const lang = (language || "").toLowerCase();
  
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  if (!["javascript", "typescript", "python", "java", "cpp", "html", "css", "sql"].includes(lang)) {
    return escaped;
  }
  
  let regex = /(\/\/.*|#.*)|(["'`])(.*?)\2|\b(\d+)\b|\b(function|const|let|var|return|class|import|export|from|default|if|else|for|while|do|switch|case|break|continue|new|this|try|catch|finally|throw|async|await|def|elif|print|public|private|protected|void|static|final|int|double|float|boolean|char|String)\b|\b(\w+)(?=\()/g;
  
  if (lang === "html") {
    regex = /(&lt;!--.*?--&gt;)|(&lt;\/?[a-zA-Z0-9:-]+)|(\s[a-zA-Z0-9:-]+=)|(".*?"|'.*?')/g;
  } else if (lang === "css") {
    regex = /(\/\*.*?\*\/)|([a-zA-Z0-9-]+)(?=\s*:)|(:\s*[^;]+;)/g;
  } else if (lang === "sql") {
    regex = /(--.*)|(["'])(.*?)\2|\b(\d+)\b|\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|AND|OR|INSERT|UPDATE|DELETE|CREATE|TABLE|DROP|INDEX|ALTER|INTO|VALUES|SET|DEFAULT|NULL|NOT|PRIMARY|KEY|FOREIGN|REFERENCES|GROUP|BY|ORDER|HAVING|LIMIT|COUNT|SUM|AVG|MIN|MAX)\b/gi;
  }

  return escaped.replace(regex, (match, ...groups) => {
    if (lang === "html") {
      const [comment, tag, attr, val] = groups;
      if (comment) return `<span class="text-slate-500">${match}</span>`;
      if (tag) return match.replace(/(&lt;\/?)(.*)/, '$1<span class="text-purple-400">$2</span>');
      if (attr) return match.replace(/(\s)(.*)(=)/, '$1<span class="text-blue-400">$2</span>$3');
      if (val) return `<span class="text-emerald-400">${match}</span>`;
      return match;
    }
    
    if (lang === "css") {
      const [comment, prop, val] = groups;
      if (comment) return `<span class="text-slate-500">${match}</span>`;
      if (prop) return `<span class="text-blue-400">${match}</span>`;
      if (val) return match.replace(/(:\s*)(.*)(;)/, '$1<span class="text-emerald-400">$2</span>$3');
      return match;
    }

    const [comment, stringQuote, stringContent, number, keyword, func] = groups;
    if (comment) return `<span class="text-slate-500">${match}</span>`;
    if (stringQuote) return `<span class="text-emerald-400">${match}</span>`;
    if (number) return `<span class="text-amber-400">${match}</span>`;
    if (keyword) return `<span class="text-purple-400">${match}</span>`;
    if (func) return `<span class="text-blue-400">${match}</span>`;
    
    return match;
  });
}

export default function TechnologyWorkspacePage() {
  const { slug } = useParams() as { slug: string };
  const [tech, setTech] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");

  // Expanded and Copied states
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Manual Question creation/edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [answer, setAnswer] = useState("");
  const [codeExample, setCodeExample] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [frequency, setFrequency] = useState<"RARE" | "COMMON" | "VERY_COMMON">("COMMON");
  const [selectedTags, setSelectedTags] = useState<string[]>(["INTERMEDIATE"]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Technology Workspace states
  const [isEditTechModalOpen, setIsEditTechModalOpen] = useState(false);
  const [editTechName, setEditTechName] = useState("");
  const [editTechDesc, setEditTechDesc] = useState("");
  const [techSubmitting, setTechSubmitting] = useState(false);

  // AI Generation state
  const [generating, setGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    
    toast.loading("Deleting question...", { id: "delete-question" });
    try {
      const res = await deleteQuestion(target.id);
      if (res.error) {
        toast.error(res.error, { id: "delete-question" });
        return;
      }
      toast.success("Question deleted successfully!", { id: "delete-question" });
      loadData(); // Reload list
    } catch (err) {
      toast.error("Failed to delete question", { id: "delete-question" });
    }
  };

  const loadData = async () => {
    try {
      const data = await getTechnologyBySlug(slug);
      if (data) {
        setTech(data);
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
      toast.error("Failed to load technology details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartAddQuestion = () => {
    setEditTarget(null);
    setTitle("");
    setAnswer("");
    setCodeExample("");
    setCodeLanguage("javascript");
    setDifficulty("MEDIUM");
    setFrequency("COMMON");
    setSelectedTags(["INTERMEDIATE"]);
    setIsModalOpen(true);
  };

  const handleStartEditQuestion = (q: any) => {
    setEditTarget(q);
    setTitle(q.title);
    setAnswer(q.answer || "");
    setCodeExample(q.codeExample || "");
    setCodeLanguage(q.codeLanguage || "javascript");
    setDifficulty(q.difficulty);
    setFrequency(q.interviewFrequency);
    setSelectedTags(q.tags || []);
    setIsModalOpen(true);
  };

  const handleStartEditTech = () => {
    if (!tech) return;
    setEditTechName(tech.name);
    setEditTechDesc(tech.description || "");
    setIsEditTechModalOpen(true);
  };

  const handleUpdateTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTechName.trim() || !tech) return;

    setTechSubmitting(true);
    try {
      const res = await updateTechnology(tech.id, editTechName, editTechDesc);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Workspace updated successfully!");
      setIsEditTechModalOpen(false);
      const newSlug = res.technology?.slug;
      if (newSlug && newSlug !== slug) {
        window.location.href = `/technologies/${newSlug}`;
      } else {
        loadData();
      }
    } catch (err) {
      toast.error("Failed to update technology");
    } finally {
      setTechSubmitting(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !tech) return;

    setSubmitting(true);
    try {
      if (editTarget) {
        // Edit mode
        const res = await updateQuestion(editTarget.id, {
          title,
          answer: answer.trim() || undefined,
          codeExample: codeExample.trim() || undefined,
          codeLanguage: codeExample.trim() ? codeLanguage : undefined,
          difficulty,
          interviewFrequency: frequency,
          tags: selectedTags as any[],
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Question updated successfully!");
      } else {
        // Create mode
        const res = await createQuestion({
          title,
          answer: answer.trim() || undefined,
          codeExample: codeExample.trim() || undefined,
          codeLanguage: codeExample.trim() ? codeLanguage : undefined,
          difficulty,
          interviewFrequency: frequency,
          tags: selectedTags as any[],
          technologyId: tech.id,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Question created successfully!");
      }

      setIsModalOpen(false);
      setEditTarget(null);
      setTitle("");
      setAnswer("");
      setCodeExample("");
      setSelectedTags(["INTERMEDIATE"]);
      loadData();
    } catch (err) {
      toast.error(editTarget ? "Failed to update question" : "Failed to create question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!tech) return;
    setGenerating(true);
    toast.loading("AI is generating tailored interview questions...", { id: "ai-gen" });
    try {
      const res = await generateAIQuestions(tech.id, tech.name);
      if (res.error) {
        toast.error(res.error, { id: "ai-gen" });
        return;
      }
      toast.success(`Successfully generated ${res.count} new questions!`, { id: "ai-gen" });
      loadData();
    } catch (err) {
      toast.error("Failed to generate questions", { id: "ai-gen" });
    } finally {
      setGenerating(false);
    }
  };

  const handleTogglePublic = async (q: any) => {
    try {
      const res = await toggleQuestionPublic(q.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const nowPublic = res.question?.isPublic;
      toast.success(nowPublic ? "Question shared to Community Library!" : "Question removed from Community Library.");
      // Optimistically update local state
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id ? { ...item, isPublic: nowPublic } : item
        )
      );
    } catch {
      toast.error("Failed to update question visibility");
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.answer && q.answer.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDifficulty =
      difficultyFilter === "ALL" || q.difficulty === difficultyFilter;

    return matchesSearch && matchesDifficulty;
  });

  const masteredCount = questions.filter((q) => q.revisionStatus === "MASTERED").length;
  const progressPercent = questions.length > 0 ? Math.round((masteredCount / questions.length) * 100) : 0;
  const icon = tech ? TECH_ICONS[tech.name.toLowerCase()] || "📦" : "📦";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 max-w-5xl mx-auto">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading workspace details...</p>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="font-semibold text-lg">Workspace not found</h3>
        <p className="text-sm text-muted-foreground">
          The technology workspace you are trying to view does not exist.
        </p>
        <Link
          href="/technologies"
          className="inline-block gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all cursor-pointer"
        >
          Return to Workspaces
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Back + Header */}
      <motion.div variants={fadeInUp}>
        <Link
          href="/technologies"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Technologies
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{tech.name}</h1>
                <button
                  onClick={handleStartEditTech}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Edit Technology Workspace"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <p className="text-muted-foreground">
                {questions.length} questions · {masteredCount} mastered · {progressPercent}% ready
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateAI}
              disabled={generating}
              className="flex items-center gap-2 glass px-4 py-2.5 rounded-xl hover:bg-muted/80 transition-all text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              Generate with AI
            </button>
            <button
              onClick={handleStartAddQuestion}
              className="flex items-center gap-2 gradient-bg text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 text-sm font-semibold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          </div>
        </div>
      </motion.div>

      {/* Difficulty Tabs */}
      <motion.div variants={fadeInUp} className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { label: "All Questions", value: "ALL" },
          { label: "Easy", value: "EASY" },
          { label: "Medium", value: "MEDIUM" },
          { label: "Hard", value: "HARD" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setDifficultyFilter(tab.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer",
              difficultyFilter === tab.value
                ? "gradient-bg text-white shadow-lg shadow-primary/25"
                : "glass hover:bg-muted text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
      </motion.div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12 bg-card/20 border border-border/50 rounded-2xl p-8">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-semibold text-base mb-1">No questions found</h3>
          <p className="text-sm text-muted-foreground">
            {questions.length === 0
              ? "This workspace has no questions yet. Click Add Question or Generate with AI to get started."
              : "No questions match your search filters."}
          </p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} className="space-y-3">
          {filteredQuestions.map((q) => (
            <motion.div key={q.id} variants={fadeInUp}>
              <GlassCard className="p-0 overflow-hidden">
                {/* Question Header (clickable) */}
                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="w-full text-left p-5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base">{q.title}</h3>
                      {q.isPublic && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                          <Globe className="h-2.5 w-2.5" />
                          Public
                        </span>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", difficultyColors[q.difficulty as keyof typeof difficultyColors])}>
                        {q.difficulty}
                      </span>
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", statusColors[q.revisionStatus as keyof typeof statusColors])}>
                        {statusLabels[q.revisionStatus as keyof typeof statusLabels]}
                      </span>
                      {q.tags && q.tags.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {tag.replace("_", " ")}
                        </span>
                      ))}
                      <span className="text-[11px] text-muted-foreground">
                        {q.interviewFrequency === "VERY_COMMON" ? "🔥 Very Common" : q.interviewFrequency === "COMMON" ? "📌 Common" : "💤 Rare"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Share to Community toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePublic(q);
                      }}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all cursor-pointer z-10",
                        q.isPublic
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                          : "border-border bg-black/10 text-muted-foreground hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500"
                      )}
                      title={q.isPublic ? "Remove from Community Library" : "Share to Community Library"}
                    >
                      {q.isPublic ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditQuestion(q);
                      }}
                      className="p-1.5 rounded-lg border border-border bg-black/10 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all cursor-pointer z-10"
                      title="Edit Question"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: q.id, title: q.title });
                      }}
                      className="p-1.5 rounded-lg border border-border bg-black/10 hover:bg-red-500/10 hover:border-red-500/30 text-muted-foreground hover:text-red-500 transition-all cursor-pointer z-10"
                      title="Delete Question"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                    <motion.div
                      animate={{ rotate: expandedId === q.id ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === q.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4">
                        {/* Answer */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Answer</h4>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.answer || "No answer details provided."}</p>
                        </div>

                        {/* Code Example */}
                        {q.codeExample && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Code2 className="h-3.5 w-3.5" />
                              Code Example
                            </h4>
                            
                            <div className="rounded-xl border border-border bg-[#030712] overflow-hidden shadow-2xl">
                              {/* Code Window Header */}
                              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b0f19] border-b border-border/40">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                  <Code2 className="h-3.5 w-3.5 text-primary" />
                                  <span>{q.codeLanguage ? (languageNames[q.codeLanguage.toLowerCase()] || q.codeLanguage) : "Code"}</span>
                                </div>
                                <button
                                  onClick={() => handleCopy(q.codeExample!, q.id)}
                                  className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                  title="Copy Code"
                                >
                                  {copiedId === q.id ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              
                              {/* Code Window Body */}
                              <pre className="p-4 sm:p-5 overflow-x-auto text-xs sm:text-sm font-mono text-slate-100 bg-[#090d16] leading-relaxed">
                                <code dangerouslySetInnerHTML={{ __html: highlightCode(q.codeExample, q.codeLanguage || "javascript") }} />
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add/Edit Question Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg overflow-y-auto max-h-[90vh] rounded-2xl glass-strong border border-border p-6 shadow-2xl relative z-10 space-y-4"
            >
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editTarget ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editTarget ? "Edit Interview Question" : "Add Interview Question"}
              </h2>
              <form onSubmit={handleSubmitQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Question Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., What is Virtual DOM in React?"
                    className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Answer</label>
                  <textarea
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Provide the comprehensive answer..."
                    className="w-full h-32 rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Code Example (Optional)</label>
                  <textarea
                    value={codeExample}
                    onChange={(e) => setCodeExample(e.target.value)}
                    placeholder="Paste sample code snippet here..."
                    className="w-full h-24 rounded-xl border border-border bg-black/20 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
                </div>
                {codeExample.trim() && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Code Language</label>
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="sql">SQL</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="RARE">Rare</option>
                      <option value="COMMON">Common</option>
                      <option value="VERY_COMMON">Very Common</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tags (Select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {["BEGINNER", "INTERMEDIATE", "ADVANCED", "FREQUENTLY_ASKED"].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                          selectedTags.includes(tag)
                            ? "gradient-bg border-transparent text-white shadow-md shadow-primary/25"
                            : "border-border bg-black/20 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {tag.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editTarget ? "Save Changes" : "Create Question"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Technology Modal */}
      <AnimatePresence>
        {isEditTechModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditTechModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-2xl glass-strong border border-border p-6 shadow-2xl relative z-10"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                Edit Technology Workspace
              </h2>
              <form onSubmit={handleUpdateTech} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Technology Name</label>
                  <input
                    type="text"
                    required
                    value={editTechName}
                    onChange={(e) => setEditTechName(e.target.value)}
                    placeholder="e.g., React, Go, Docker"
                    className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description (Optional)</label>
                  <textarea
                    value={editTechDesc}
                    onChange={(e) => setEditTechDesc(e.target.value)}
                    placeholder="Brief description of the workspace..."
                    className="w-full h-24 rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditTechModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={techSubmitting}
                    className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {techSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl glass-strong border border-border p-6 shadow-2xl relative z-10 text-center"
            >
              <div className="p-3 bg-red-500/10 rounded-2xl w-fit mx-auto mb-4 border border-red-500/20">
                <Trash className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete Question?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete the question <span className="font-semibold text-foreground">"{deleteTarget.title}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
