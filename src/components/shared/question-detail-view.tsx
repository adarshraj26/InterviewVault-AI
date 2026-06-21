"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MarkdownRenderer, extractToc, isMarkdownContent } from "./markdown-renderer";
import { ShareBar, ShareModal } from "./share-modal";

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
  };
  technologyName: string;
  allQuestions?: any[];
  onClose: () => void;
  onSelectQuestion?: (q: any) => void;
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
  onClose,
  onSelectQuestion,
}: QuestionDetailViewProps) {
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  const [showMobileToc, setShowMobileToc] = useState(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);

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

  // Extract table of contents from markdown
  const toc = useMemo(() => {
    if (!isMarkdown) return [];
    return extractToc(fullContent);
  }, [fullContent, isMarkdown]);

  const readTime = useMemo(() => estimateReadTime(fullContent), [fullContent]);

  const similarQuestions = useMemo(() => {
    if (!allQuestions || allQuestions.length === 0) return [];
    return allQuestions
      .filter((q) => q.id !== question.id)
      .slice(0, 2);
  }, [allQuestions, question.id]);

  // Track active heading for TOC highlighting
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeadingId(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0.1,
      }
    );

    const timer = setTimeout(() => {
      toc.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [toc]);

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

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowMobileToc(false);
    }
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
            <span className="hover:text-foreground transition-all cursor-pointer">Questions</span>
            <span className="text-muted-foreground/40">›</span>
            <span className="hover:text-foreground transition-all cursor-pointer">{technologyName}</span>
            <span className="text-muted-foreground/40">›</span>
            <span className="text-foreground font-bold truncate max-w-[250px]">{question.title}</span>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-16">
          <div className="flex gap-8 items-stretch">
            {/* Main Article */}
            <main className="flex-1 min-w-0">
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
                        dangerouslySetInnerHTML={{ __html: answerContent }}
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
                      const snippet = q.answer
                        ? q.answer.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
                        : "";
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

            {/* Table of Contents Sidebar */}
            {toc.length > 0 && (
              <aside className="hidden lg:block w-64 shrink-0">
                <div className="toc-sidebar">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3">
                    On This Page
                  </div>
                  <nav className="space-y-0.5 border-l border-border/30 pl-4">
                    {toc.map(({ id, text, level }) => (
                      <button
                        key={id}
                        onClick={() => scrollToHeading(id)}
                        className={cn(
                          "toc-link w-full text-left cursor-pointer",
                          level === 3 && "toc-link-h3",
                          activeHeadingId === id && "active"
                        )}
                      >
                        {text}
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* Mobile TOC toggle */}
      {toc.length > 0 && (
        <>
          <button
            onClick={() => setShowMobileToc(!showMobileToc)}
            className="fixed bottom-6 right-6 z-50 lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/95 backdrop-blur-xl border border-border text-sm font-semibold text-foreground shadow-lg shadow-black/10 hover:bg-muted/80 transition-all cursor-pointer"
          >
            <List className="h-4 w-4" />
            Contents
          </button>

          {/* Mobile TOC drawer */}
          <AnimatePresence>
            {showMobileToc && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileToc(false)}
                  className="fixed inset-0 z-50 lg:hidden bg-black/40 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25 }}
                  className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border rounded-t-2xl p-6 max-h-[60vh] overflow-y-auto shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold">Table of Contents</h3>
                    <button
                      onClick={() => setShowMobileToc(false)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <nav className="space-y-1 border-l border-border/30 pl-4">
                    {toc.map(({ id, text, level }) => (
                      <button
                        key={id}
                        onClick={() => scrollToHeading(id)}
                        className={cn(
                          "toc-link w-full text-left cursor-pointer",
                          level === 3 && "toc-link-h3",
                          activeHeadingId === id && "active"
                        )}
                      >
                        {text}
                      </button>
                    ))}
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
