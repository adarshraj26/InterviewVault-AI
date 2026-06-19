"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, Clock, RotateCcw, Search, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { recordRevision } from "@/actions/questions";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

const statusColors: Record<string, string> = {
  NOT_STARTED: "bg-slate-400/10 text-slate-400 border-slate-400/20",
  LEARNING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  REVISED_ONCE: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  MASTERED: "bg-green-500/10 text-green-500 border-green-500/20",
};

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Not Started",
  LEARNING: "Learning",
  REVISED_ONCE: "Revised Once",
  MASTERED: "Mastered",
};

interface QuestionItem {
  id: string;
  title: string;
  answer: string | null;
  revisionStatus: string;
  createdAt: Date;
  technology: {
    name: string;
    slug: string;
  };
  revisionRecords: {
    nextReviewAt: Date | null;
    revisedAt: Date;
  }[];
}

export default function RevisionDashboard({ 
  initialQuestions,
  streak,
  dueCount
}: { 
  initialQuestions: any[];
  streak: number;
  dueCount: number;
}) {
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeReviewQuestion, setActiveReviewQuestion] = useState<QuestionItem | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) || 
                          q.technology.name.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    if (filter === "due") {
      const lastRec = q.revisionRecords[0];
      return !lastRec?.nextReviewAt || new Date(lastRec.nextReviewAt) <= new Date();
    }
    return q.revisionStatus === filter;
  });

  const handleReviewClick = (q: QuestionItem) => {
    setActiveReviewQuestion(q);
    setShowAnswer(false);
  };

  const handleQualitySubmit = async (quality: number) => {
    if (!activeReviewQuestion) return;
    setSubmitting(true);
    try {
      const res = await recordRevision(activeReviewQuestion.id, quality);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Revision progress updated!");
      
      // Update local state to remove or update
      setQuestions((prev) => 
        prev.map((q) => {
          if (q.id === activeReviewQuestion.id) {
            return {
              ...q,
              revisionStatus: quality === 5 ? "MASTERED" : "LEARNING",
              revisionRecords: [{ nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000), revisedAt: new Date() }, ...q.revisionRecords]
            };
          }
          return q;
        })
      );
      
      setActiveReviewQuestion(null);
    } catch (e) {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Revision</h1>
          <p className="text-muted-foreground mt-1">Spaced repetition to master your interview questions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{dueCount} due today</span>
          </div>
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{streak} day streak</span>
          </div>
        </div>
      </div>

      {/* Main Grid / Review Area */}
      <AnimatePresence mode="wait">
        {activeReviewQuestion ? (
          <motion.div 
            key="review-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassCard className="p-8 border border-primary/20 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 gradient-bg opacity-5 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/15 text-primary">
                  {activeReviewQuestion.technology.name}
                </span>
                <button 
                  onClick={() => setActiveReviewQuestion(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              <h2 className="text-2xl font-bold leading-relaxed">{activeReviewQuestion.title}</h2>

              {showAnswer ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6 pt-4 border-t border-border"
                >
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-500 block">Explanation:</span>
                    {activeReviewQuestion.answer ? (
                      /<[a-z][\s\S]*>/i.test(activeReviewQuestion.answer) ? (
                        <div
                          className="rich-text-content text-sm leading-relaxed text-muted-foreground bg-black/20 p-4 rounded-xl border border-border"
                          dangerouslySetInnerHTML={{ __html: activeReviewQuestion.answer }}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line bg-black/20 p-4 rounded-xl border border-border">
                          {activeReviewQuestion.answer}
                        </p>
                      )
                    ) : (
                      <p className="text-sm leading-relaxed text-muted-foreground italic bg-black/20 p-4 rounded-xl border border-border">
                        No answer explanation provided.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary block">Rate your recall quality:</span>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        { val: 0, label: "Forgot" },
                        { val: 1, label: "Incorrect" },
                        { val: 2, label: "Difficult" },
                        { val: 3, label: "Vague" },
                        { val: 4, label: "Good" },
                        { val: 5, label: "Perfect" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          disabled={submitting}
                          onClick={() => handleQualitySubmit(item.val)}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-border glass hover:bg-primary/10 hover:border-primary/30 transition-all"
                        >
                          <span className="text-lg font-bold">{item.val}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full py-4 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/25"
                >
                  Reveal Answer
                </button>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div 
            key="list-mode"
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-6"
          >
            {/* Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2">
                {[
                  { label: "All", value: "all" },
                  { label: "Due Today", value: "due" },
                  { label: "Not Started", value: "NOT_STARTED" },
                  { label: "Learning", value: "LEARNING" },
                  { label: "Mastered", value: "MASTERED" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                      filter === f.value ? "gradient-bg text-white shadow-lg shadow-primary/25" : "glass hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-black/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Revision Queue List */}
            {filteredQuestions.length === 0 ? (
              <GlassCard className="p-8 text-center text-muted-foreground">
                No revision items found matching your filters.
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((item) => {
                  const lastRec = item.revisionRecords[0];
                  const isDue = !lastRec?.nextReviewAt || new Date(lastRec.nextReviewAt) <= new Date();

                  return (
                    <GlassCard key={item.id} hover className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border",
                          isDue ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-slate-500/10 border-border text-slate-400"
                        )}>
                          <RotateCcw className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-snug">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{item.technology.name}</span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", statusColors[item.revisionStatus])}>
                              {statusLabels[item.revisionStatus]}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {isDue 
                                ? "Due now" 
                                : `Due ${formatDistanceToNow(new Date(lastRec.nextReviewAt || ""), { addSuffix: true })}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReviewClick(item)}
                        className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25"
                      >
                        Review
                      </button>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
