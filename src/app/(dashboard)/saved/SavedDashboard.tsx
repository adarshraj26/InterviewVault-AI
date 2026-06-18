"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Search,
  FolderInput,
  Trash2,
  ChevronRight,
  Code2,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Filter,
  Globe,
} from "lucide-react";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { toggleBookmarkQuestion, moveQuestionToTechnology } from "@/actions/questions";
import { TECH_ICONS } from "@/constants";
import { toast } from "sonner";
import Link from "next/link";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-500/10 text-green-500 border border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
  HARD: "bg-red-500/10 text-red-500 border border-red-500/20",
};

interface SavedQuestion {
  bookmarkId: string;
  bookmarkedAt: string;
  id: string;
  title: string;
  answer: string | null;
  codeExample: string | null;
  codeLanguage: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  interviewFrequency: string;
  tags: string[];
  isPublic: boolean;
  technology: { id: string; name: string; slug: string };
  user: { name: string | null; email: string };
}

interface Technology {
  id: string;
  name: string;
  slug: string;
}

export default function SavedDashboard({
  initialSaved,
  technologies,
}: {
  initialSaved: SavedQuestion[];
  technologies: Technology[];
}) {
  const [saved, setSaved] = useState<SavedQuestion[]>(initialSaved);
  const [search, setSearch] = useState("");
  const [techFilter, setTechFilter] = useState("All");
  const [diffFilter, setDiffFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Move modal state
  const [moveTarget, setMoveTarget] = useState<SavedQuestion | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveSearch, setMoveSearch] = useState("");

  const techFilters = useMemo(
    () => ["All", ...Array.from(new Set(saved.map((q) => q.technology.name)))],
    [saved]
  );

  const filtered = useMemo(
    () =>
      saved.filter((q) => {
        const s = search.toLowerCase();
        const matchSearch =
          !s ||
          q.title.toLowerCase().includes(s) ||
          q.answer?.toLowerCase().includes(s) ||
          q.technology.name.toLowerCase().includes(s);
        const matchTech = techFilter === "All" || q.technology.name === techFilter;
        const matchDiff = diffFilter === "ALL" || q.difficulty === diffFilter;
        return matchSearch && matchTech && matchDiff;
      }),
    [saved, search, techFilter, diffFilter]
  );

  // Tech breakdown counts
  const techBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    saved.forEach((q) => {
      counts[q.technology.name] = (counts[q.technology.name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [saved]);

  const filteredMoveTargets = technologies.filter(
    (t) =>
      t.id !== moveTarget?.technology.id &&
      t.name.toLowerCase().includes(moveSearch.toLowerCase())
  );

  const handleUnsave = async (q: SavedQuestion) => {
    toast.loading("Removing bookmark...", { id: `unsave-${q.id}` });
    try {
      const res = await toggleBookmarkQuestion(q.id);
      if (res.error) {
        toast.error(res.error, { id: `unsave-${q.id}` });
        return;
      }
      setSaved((prev) => prev.filter((item) => item.id !== q.id));
      toast.success("Question removed from saved.", { id: `unsave-${q.id}` });
    } catch {
      toast.error("Failed to remove bookmark", { id: `unsave-${q.id}` });
    }
  };

  const handleMove = async (targetTechId: string, targetTechName: string) => {
    if (!moveTarget) return;
    setMovingId(targetTechId);
    try {
      const res = await moveQuestionToTechnology(moveTarget.id, targetTechId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // Update local state
      setSaved((prev) =>
        prev.map((q) =>
          q.id === moveTarget.id
            ? {
                ...q,
                technology: {
                  id: targetTechId,
                  name: targetTechName,
                  slug: targetTechName.toLowerCase().replace(/\s+/g, "-"),
                },
              }
            : q
        )
      );
      toast.success(`Moved to "${targetTechName}" workspace!`);
      setMoveTarget(null);
      setMoveSearch("");
    } catch {
      toast.error("Failed to move question");
    } finally {
      setMovingId(null);
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-8 max-w-5xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bookmark className="h-7 w-7 text-primary" />
            Saved Questions
          </h1>
          <p className="text-muted-foreground mt-1">
            Your personal bookmark collection —{" "}
            <span className="font-semibold text-foreground">{saved.length}</span> question{saved.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Link
          href="/community"
          className="flex items-center gap-2 glass border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all"
        >
          <Globe className="h-4 w-4 text-primary" />
          Browse Community
        </Link>
      </motion.div>

      {/* Stats bar */}
      {techBreakdown.length > 0 && (
        <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Bookmark className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{saved.length}</p>
              <p className="text-xs text-muted-foreground">Total Saved</p>
            </div>
          </GlassCard>
          <GlassCard className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <Sparkles className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{saved.filter((q) => q.difficulty === "EASY").length}</p>
              <p className="text-xs text-muted-foreground">Easy</p>
            </div>
          </GlassCard>
          <GlassCard className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{saved.filter((q) => q.difficulty === "MEDIUM").length}</p>
              <p className="text-xs text-muted-foreground">Medium</p>
            </div>
          </GlassCard>
          <GlassCard className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <Sparkles className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{saved.filter((q) => q.difficulty === "HARD").length}</p>
              <p className="text-xs text-muted-foreground">Hard</p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Category breakdown pills */}
      {techBreakdown.length > 1 && (
        <motion.div variants={fadeInUp} className="flex items-center gap-2 flex-wrap">
          {techBreakdown.map(([name, count]) => {
            const icon = TECH_ICONS[name.toLowerCase()] || "📦";
            return (
              <button
                key={name}
                onClick={() => setTechFilter(techFilter === name ? "All" : name)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  techFilter === name
                    ? "gradient-bg text-white border-transparent shadow-lg shadow-primary/20"
                    : "bg-muted/50 border-border hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                <span>{icon}</span>
                {name}
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  techFilter === name ? "bg-white/20" : "bg-muted"
                )}>{count}</span>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Search & Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved questions..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {["ALL", "EASY", "MEDIUM", "HARD"].map((d) => (
            <button
              key={d}
              onClick={() => setDiffFilter(d)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap",
                diffFilter === d
                  ? "gradient-bg text-white border-transparent"
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              {d === "ALL" ? "All" : d.charAt(0) + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Questions List */}
      {filtered.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <GlassCard className="p-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Bookmark className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                {saved.length === 0 ? "No saved questions yet" : "No results match your filters"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {saved.length === 0
                  ? "Browse the Community Library and click the bookmark icon on any question to save it here."
                  : "Try clearing your search or changing the filters."}
              </p>
            </div>
            {saved.length === 0 && (
              <Link
                href="/community"
                className="inline-flex items-center gap-2 gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Browse Community Library
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="space-y-3">
          {filtered.map((q) => {
            const icon = TECH_ICONS[q.technology.name.toLowerCase()] || "📦";
            return (
              <motion.div key={q.id} variants={fadeInUp}>
                <GlassCard className="p-0 overflow-hidden">
                  {/* Question header — outer div, inner action buttons are siblings not descendants */}
                  <div className="flex items-stretch">
                    {/* Clickable expand area */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedId(expandedId === q.id ? null : q.id)}
                      className="flex-1 min-w-0 p-5 flex items-start sm:items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base leading-snug">{q.title}</h3>
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {q.technology.name}
                          </span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", difficultyColors[q.difficulty])}>
                            {q.difficulty}
                          </span>
                          {q.tags?.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              {tag.replace("_", " ")}
                            </span>
                          ))}
                          <span className="text-[10px] text-muted-foreground">
                            {q.interviewFrequency === "VERY_COMMON" ? "🔥 Very Common" : q.interviewFrequency === "COMMON" ? "📌 Common" : "💤 Rare"}
                          </span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: expandedId === q.id ? 90 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </motion.div>
                    </div>

                    {/* Action buttons — right column, NOT inside the expand div */}
                    <div className="flex flex-col items-center justify-center gap-2 px-3 border-l border-border/40">
                      <button
                        onClick={() => { setMoveTarget(q); setMoveSearch(""); }}
                        title="Move to a different workspace"
                        className="p-1.5 rounded-lg border border-border bg-black/10 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                      >
                        <FolderInput className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleUnsave(q)}
                        title="Remove bookmark"
                        className="p-1.5 rounded-lg border border-border bg-black/10 hover:bg-red-500/10 hover:border-red-500/30 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>


                  {/* Expanded answer */}
                  <AnimatePresence>
                    {expandedId === q.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Answer</h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.answer || "No answer provided."}</p>
                          </div>
                          {q.codeExample && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Code2 className="h-3.5 w-3.5" /> Code Example
                              </h4>
                              <div className="rounded-xl border border-border bg-[#030712] overflow-hidden shadow-2xl">
                                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b0f19] border-b border-border/40">
                                  <span className="text-xs font-semibold text-slate-300">{q.codeLanguage || "Code"}</span>
                                  <button
                                    onClick={() => handleCopy(q.codeExample!, q.id)}
                                    className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                  >
                                    {copiedId === q.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </button>
                                </div>
                                <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-slate-100 leading-relaxed">
                                  <code>{q.codeExample}</code>
                                </pre>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground border-t border-border/40 pt-3">
                            Shared by{" "}
                            <span className="font-semibold text-foreground">
                              {q.user.name || q.user.email.split("@")[0]}
                            </span>{" "}
                            · In{" "}
                            <Link
                              href={`/technologies/${q.technology.slug}`}
                              className="text-primary hover:underline font-semibold"
                            >
                              {q.technology.name}
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Move to Workspace Modal */}
      <AnimatePresence>
        {moveTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setMoveTarget(null); setMoveSearch(""); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl glass-strong border border-border p-6 shadow-2xl relative z-10 space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-0.5">
                  <FolderInput className="h-5 w-5 text-primary" />
                  Move to Workspace
                </h2>
                <p className="text-xs text-muted-foreground">
                  Currently in{" "}
                  <span className="font-semibold text-foreground">{moveTarget.technology.name}</span>
                </p>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/30 border border-border/50 rounded-xl px-3 py-2">
                {moveTarget.title}
              </p>

              {/* Search workspaces */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={moveSearch}
                  onChange={(e) => setMoveSearch(e.target.value)}
                  placeholder="Search workspaces..."
                  className="w-full rounded-xl border border-border bg-black/20 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Workspace list */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {filteredMoveTargets.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-6">No other workspaces found.</p>
                ) : (
                  filteredMoveTargets.map((tech) => {
                    const icon = TECH_ICONS[tech.name.toLowerCase()] || "📦";
                    const isMoving = movingId === tech.id;
                    return (
                      <button
                        key={tech.id}
                        onClick={() => handleMove(tech.id, tech.name)}
                        disabled={!!movingId}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left cursor-pointer disabled:opacity-50 group"
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="flex-1 text-sm font-medium">{tech.name}</span>
                        {isMoving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => { setMoveTarget(null); setMoveSearch(""); }}
                className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
