"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
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
  onClose: () => void;
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
  onClose,
}: QuestionDetailViewProps) {
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  const [showMobileToc, setShowMobileToc] = useState(false);

  const answerContent = question.answer || "";
  const isMarkdown = isMarkdownContent(answerContent);

  // Build full content: if there's a codeExample separate from the answer, append it
  const fullContent = useMemo(() => {
    let content = answerContent;
    if (question.codeExample && isMarkdown) {
      // If answer is markdown and there's a separate code example, append it
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

    // Observe all heading elements
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

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowMobileToc(false);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
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
          <div className="flex gap-8 items-start">
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
    </motion.div>
  );
}
