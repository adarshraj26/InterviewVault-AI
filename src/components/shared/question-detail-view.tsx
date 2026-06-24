"use client";

import { useState, useEffect, useMemo, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Code2,
  Globe,
  List,
  Tag,
  X,
  CheckCircle,
  Bookmark,
  ChevronRight,
} from "lucide-react";

import { cn, stripMarkdown } from "@/lib/utils";
import { MarkdownRenderer, extractToc, isMarkdownContent } from "./markdown-renderer";
import { ShareBar, ShareModal } from "./share-modal";
import { Footer } from "@/components/shared";
import { updateQuestion } from "@/actions/questions";
import { saveToMyVault } from "@/actions/ownership";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   QuestionDetailView — FrontendPrep.io-style article reader
   ═══════════════════════════════════════════════════════════ */

interface QuestionDetailViewProps {
  question: {
    id: string;
    title: string;
    answer?: string | null;
    codeExample?: string | null;
    codeLanguage?: string | null;
    difficulty: string;
    interviewFrequency: string;
    tags?: string[];
    isPublic?: boolean;
    isGlobal?: boolean;
    revisionStatus?: string;
  };
  technologyName: string;
  allQuestions?: any[];
  isAdmin?: boolean;
  onClose: () => void;
  onSelectQuestion?: (q: any) => void;
  onUpdateQuestion?: (q: any) => void;
}

const difficultyColors: Record<string, string> = {
  EASY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HARD: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

function estimateReadTime(text: string): number {
  const words = text.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function QuestionDetailView({
  question,
  technologyName,
  allQuestions = [],
  isAdmin = false,
  onClose,
  onSelectQuestion,
  onUpdateQuestion,
}: QuestionDetailViewProps) {
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [isDone, setIsDone] = useState(question.revisionStatus === "MASTERED");
  const [isSaved, setIsSaved] = useState(false);
  const [savingToVault, setSavingToVault] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  const [showMobileToc, setShowMobileToc] = useState(false);
  const tocSidebarRef = useRef<HTMLElement>(null);

  const answerContent = question.answer || "";
  const isMarkdown = isMarkdownContent(answerContent);

  // Build full content: if there's a codeExample separate from the answer, append it
  const fullContent = useMemo(() => {
    let content = answerContent;
    if (question.codeExample && isMarkdown) {
      content += `\n\n### Code Example\n\n\`\`\`${question.codeLanguage || "javascript"}\n${question.codeExample}\n\`\`\``;
    }
    return content;
  }, [answerContent, question.codeExample, question.codeLanguage, isMarkdown]);

  // Extract table of contents
  const toc = useMemo(() => {
    return extractToc(fullContent);
  }, [fullContent]);

  const handleToggleDone = () => {
    const newIsDone = !isDone;
    setIsDone(newIsDone);

    const updatedStatus = newIsDone ? "MASTERED" : "NOT_STARTED";
    if (onUpdateQuestion) {
      onUpdateQuestion({ ...question, revisionStatus: updatedStatus });
    }

    startTransition(async () => {
      await updateQuestion(question.id, { revisionStatus: updatedStatus });
    });
  };

  // Inject IDs into HTML content for scrollspy to work
  const processedHtmlContent = useMemo(() => {
    if (isMarkdown || !answerContent) return answerContent;
    let usedIds = new Set<string>();
    return answerContent.replace(/<h([23])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
      let baseId = text
        .replace(/<[^>]+>/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || "heading";
      let id = baseId;
      let counter = 1;
      while (usedIds.has(id)) id = `${baseId}-${counter++}`;
      usedIds.add(id);
      // Ensure we don't duplicate id if it already exists in attrs
      if (attrs.includes('id=')) return match;
      return `<h${level} id="${id}"${attrs}>${text}</h${level}>`;
    });
  }, [answerContent, isMarkdown]);

  const readTime = useMemo(() => estimateReadTime(fullContent), [fullContent]);

  const similarQuestions = useMemo(() => {
    if (!allQuestions || allQuestions.length === 0) return [];
    return allQuestions
      .filter((q) => q.id !== question.id)
      .slice(0, 2);
  }, [allQuestions, question.id]);

  // Track active heading for TOC highlighting using container scroll listener
  useEffect(() => {
    if (toc.length === 0) return;

    const container = document.getElementById('question-scroll-container');
    if (!container) return;

    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        let currentId = toc[0].id;
        for (const { id } of toc) {
          const el = document.getElementById(id);
          if (el) {
            const offset = el.offsetTop - container.offsetTop;
            if (offset <= scrollTop + 80) {
              currentId = id;
            } else {
              break;
            }
          }
        }
        setActiveHeadingId(currentId);
      });
    };

    // Initial call
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', onScroll);
    };
  }, [toc]);

  // Auto-scroll the TOC sidebar smoothly to keep the active item visible
  useEffect(() => {
    if (!activeHeadingId || !tocSidebarRef.current) return;
    const sidebar = tocSidebarRef.current;
    const activeBtn = sidebar.querySelector(`[data-toc-id="${activeHeadingId}"]`) as HTMLElement | null;
    if (activeBtn) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const relativeTop = btnRect.top - sidebarRect.top + sidebar.scrollTop;
      const targetScrollTop = relativeTop - sidebar.clientHeight / 2 + activeBtn.clientHeight / 2;
      sidebar.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [activeHeadingId]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowMobileToc(false);
    }
  };

  // Hide sidebar and make navbar full width when detail view is open
  useEffect(() => {
    document.body.classList.add("detail-view-open");

    const desktopSidebar = document.getElementById("desktop-sidebar");
    const mobileSidebar = document.getElementById("mobile-sidebar");
    const mainNavbar = document.getElementById("main-navbar");

    if (desktopSidebar) {
      desktopSidebar.style.setProperty("display", "none", "important");
    }
    if (mobileSidebar) {
      mobileSidebar.style.setProperty("display", "none", "important");
    }
    if (mainNavbar) {
      mainNavbar.style.setProperty("left", "0", "important");
    }

    return () => {
      document.body.classList.remove("detail-view-open");
      if (desktopSidebar) {
        desktopSidebar.style.removeProperty("display");
      }
      if (mobileSidebar) {
        mobileSidebar.style.removeProperty("display");
      }
      if (mainNavbar) {
        mainNavbar.style.removeProperty("left");
      }
    };
  }, []);

  // Render into document.body so that fixed positioning is relative to the
  // true viewport — not a transformed/positioned ancestor from Framer Motion
  // or the dashboard layout, which would constrain inset-0.
  if (typeof window === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-16 inset-x-0 bottom-0 z-[200] flex flex-col bg-background"
    >
      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors group px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to {technologyName} Questions</span>
          </button>

          {/* Breadcrumb */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-card/60 backdrop-blur-md px-4 py-2 rounded-xl border border-border">
            <Link href="/technologies" className="hover:text-foreground transition-all">Technologies</Link>
            <span className="text-muted-foreground/40">›</span>
            <button onClick={onClose} className="hover:text-foreground transition-all cursor-pointer">{technologyName}</button>
            <span className="text-muted-foreground/40">›</span>
            <span className="text-foreground font-bold truncate max-w-[250px]">{question.title}</span>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div id="question-scroll-container" className="flex-1 overflow-y-auto relative scroll-smooth">
        <div className="max-w-7xl mx-auto pl-0 pr-4 md:pr-6 pt-8 pb-16">
          <div className="flex gap-12 lg:gap-20 items-start justify-center max-w-[1400px] mx-auto">
            {/* Dynamic Premium Guide Navigation (Left Side) */}
            {toc.length > 0 && (
              <aside ref={tocSidebarRef} className="hidden lg:flex flex-col w-72 shrink-0 sticky top-24 self-start h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar bg-card/40 backdrop-blur-3xl border border-border/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-[1.5rem] p-5 z-20 transition-all mb-4">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6 px-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 border border-white/10">
                    <List className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                      Contents
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Article Outline
                    </p>
                  </div>
                </div>

                {/* Navigation List */}
                <nav className="relative flex flex-col gap-1 w-full">
                  <div className="absolute left-[13px] top-3 bottom-3 w-px bg-gradient-to-b from-indigo-500/0 via-indigo-500/20 to-purple-500/0" />

                  {toc.map(({ id, text, level }) => {
                    const isActive = activeHeadingId === id;
                    const indent = level === 1 ? 0 : level === 2 ? 0 : level === 3 ? 16 : 32;

                    return (
                      <button
                        key={id}
                        data-toc-id={id}
                        onClick={() => scrollToHeading(id)}
                        className={cn(
                          "relative flex items-center w-full text-left py-2.5 px-3 rounded-2xl transition-all duration-300 group cursor-pointer",
                          isActive ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"
                        )}
                        style={{ paddingLeft: `${indent + 36}px` }}
                      >
                        {/* Active Indicator Dot */}
                        <div className="absolute left-[11px] top-1/2 -translate-y-1/2 flex items-center justify-center">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all duration-500",
                            isActive
                              ? "bg-indigo-500 dark:bg-indigo-400 scale-100 shadow-[0_0_12px_rgba(99,102,241,0.5)] dark:shadow-[0_0_12px_rgba(129,140,248,1)]"
                              : "bg-foreground/10 scale-75 group-hover:scale-100 group-hover:bg-foreground/20"
                          )} />
                          {isActive && (
                            <motion.div
                              layoutId="active-toc-indicator"
                              className="absolute w-5 h-5 rounded-full bg-indigo-500/20 blur-[2px]"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                        </div>

                        {/* Text */}
                        <span className={cn(
                          "text-[13px] leading-snug transition-all duration-300 truncate",
                          isActive
                            ? "text-foreground font-semibold tracking-wide"
                            : "text-muted-foreground/80 group-hover:text-foreground/90"
                        )}>
                          {text}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>
            )}

            {/* Main Article */}
            <main className="flex-1 min-w-0 max-w-3xl">
              {/* Article Header */}
              <header className="mb-8 pb-6 border-b border-border/50">
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {technologyName}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border",
                      difficultyColors[question.difficulty] || "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {question.difficulty}
                  </span>
                  {question.isPublic && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Globe className="h-2.5 w-2.5" />
                      Public
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                      {question.title}
                    </h1>

                    <div className="flex items-center flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{readTime} min read</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{question.interviewFrequency === "VERY_COMMON" ? "🔥 Very Common" : question.interviewFrequency === "COMMON" ? "📌 Common" : "💤 Rare"}</span>
                      </div>
                      {question.tags && question.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" />
                          <div className="flex gap-1">
                            {question.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50 font-medium"
                              >
                                {tag.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {question.isGlobal && !isAdmin ? (
                      /* Global Questions: Can only be saved to vault */
                      <button
                        onClick={async () => {
                          setSavingToVault(true);
                          const res = await saveToMyVault(question.id);
                          setSavingToVault(false);
                          if (res.error) toast.error(res.error);
                          else toast.success("Saved to your vault!");
                        }}
                        disabled={savingToVault}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
                      >
                        <Bookmark className="h-4 w-4" />
                        {savingToVault ? "Saving..." : "Save to Vault"}
                      </button>
                    ) : (
                      /* Personal Questions: Track progress */
                      <button
                        onClick={handleToggleDone}
                        disabled={isPending}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          isDone
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                            : "bg-black/20 border-border/50 text-foreground hover:bg-muted"
                        )}
                      >
                        <CheckCircle className="h-4 w-4" />
                        {isDone ? "Done" : "Mark as Done"}
                      </button>
                    )}
                  </div>
                </div>
              </header>

              {/* Article Body */}
              <article>
                {isMarkdown ? (
                  <MarkdownRenderer content={fullContent} />
                ) : (
                  <>
                    {answerContent ? (
                      <div
                        className="rich-text-content text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: processedHtmlContent }}
                      />
                    ) : !question.codeExample ? (
                      <p className="text-sm text-muted-foreground italic py-8 text-center">
                        No answer details provided for this question.
                      </p>
                    ) : null}

                    {/* Separate code block for non-markdown */}
                    {question.codeExample && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                          <Code2 className="h-3.5 w-3.5" />
                          Code Example
                        </h3>
                        <MarkdownRenderer
                          content={`\`\`\`${question.codeLanguage || "javascript"}\n${question.codeExample}\n\`\`\``}
                        />
                      </div>
                    )}
                  </>
                )}
              </article>

              {/* Share Bar */}
              <ShareBar
                questionTitle={question.title}
                technologyName={technologyName}
                onOpenShareCard={() => setIsShareCardOpen(true)}
                className="mt-8"
              />

              {/* More Technical Questions */}
              {similarQuestions.length > 0 && (
                <div className="mt-12 space-y-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-lg font-bold text-foreground">More Technical Questions</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Expand your mastery. Deep dive into other challenges in this category.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {similarQuestions.map((q) => {
                      const snippet = q.answer ? stripMarkdown(q.answer) : "";
                      const qReadTime = estimateReadTime(q.answer || "");
                      return (
                        <div
                          key={q.id}
                          onClick={() => onSelectQuestion?.(q)}
                          className="group p-5 rounded-2xl border border-border/60 bg-card/30 hover:bg-card/50 hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-[9px] font-bold tracking-widest uppercase text-primary">
                                {technologyName}
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase",
                                q.difficulty === "EASY"
                                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                                  : q.difficulty === "HARD"
                                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                              )}>
                                {q.difficulty}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {q.title}
                            </h4>
                            <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-2 leading-relaxed">
                              {snippet || "Read full explanation."}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {qReadTime} min read
                            </span>
                            <span className="text-primary font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                              View Solution <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
        {/* Footer inside scroll container */}
        <Footer />
      </div>

      {/* Modern Floating Mobile TOC Button */}
      {toc.length > 0 && (
        <>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMobileToc(true)}
            className="fixed bottom-6 right-6 z-50 lg:hidden flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_8px_30px_rgba(99,102,241,0.4)] border border-white/20 cursor-pointer"
          >
            <List className="h-6 w-6" />
          </motion.button>

          {/* Sleek Mobile TOC Drawer */}
          <AnimatePresence>
            {showMobileToc && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileToc(false)}
                  className="fixed inset-0 z-[60] lg:hidden bg-background/80 backdrop-blur-md"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-card/95 backdrop-blur-3xl border-t border-border rounded-t-[2.5rem] p-6 pb-10 max-h-[75vh] overflow-hidden flex flex-col shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-6 px-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 border border-white/10">
                        <List className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Article Contents
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowMobileToc(false)}
                      className="p-2 rounded-full hover:bg-foreground/10 transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  <nav className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 relative space-y-1">
                    <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-500/0 via-indigo-500/20 to-purple-500/0" />

                    {toc.map(({ id, text, level }) => {
                      const isActive = activeHeadingId === id;
                      const indent = level === 1 ? 0 : level === 2 ? 0 : level === 3 ? 16 : 32;

                      return (
                        <button
                          key={id}
                          onClick={() => scrollToHeading(id)}
                          className={cn(
                            "relative flex items-center w-full text-left py-3 px-4 rounded-2xl transition-all duration-300",
                            isActive ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"
                          )}
                          style={{ paddingLeft: `${indent + 40}px` }}
                        >
                          <div className="absolute left-[13px] top-1/2 -translate-y-1/2 flex items-center justify-center">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all duration-500",
                              isActive
                                ? "bg-indigo-500 dark:bg-indigo-400 scale-100 shadow-[0_0_12px_rgba(99,102,241,0.5)] dark:shadow-[0_0_12px_rgba(129,140,248,1)]"
                                : "bg-foreground/10 scale-75"
                            )} />
                          </div>
                          <span className={cn(
                            "text-sm leading-snug transition-all duration-300 truncate",
                            isActive
                              ? "text-foreground font-semibold tracking-wide"
                              : "text-muted-foreground/80"
                          )}>
                            {text}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Share Card Modal */}
      <ShareModal
        isOpen={isShareCardOpen}
        onClose={() => setIsShareCardOpen(false)}
        question={{
          title: question.title,
          answer: fullContent,
        }}
        technologyName={technologyName}
      />
    </motion.div>,
    document.body
  );
}
