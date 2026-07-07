"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Code2, HelpCircle, FileText, X, Sparkles, Loader2, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { globalSearchAction } from "@/actions/questions";
import { cn } from "@/lib/utils";

interface SearchResultItem {
  id: string;
  title: string;
  type?: string;
  difficulty?: string;
  techName: string;
  techSlug: string;
}

interface SearchResults {
  technologies: any[];
  questions: SearchResultItem[];
  notes: SearchResultItem[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ technologies: [], questions: [], notes: [] });
  const [isPending, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults({ technologies: [], questions: [], notes: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard shortcut listener to close on Escape, navigate on arrows/enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      const flatResults = getFlatResults();
      if (flatResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, results]);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults({ technologies: [], questions: [], notes: [] });
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const searchData = await globalSearchAction(query);
          setResults(searchData);
          setSelectedIndex(0);
        } catch (err) {
          console.error(err);
        }
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = resultsContainerRef.current?.querySelector("[data-active='true']");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const getFlatResults = () => {
    const list: any[] = [];
    results.technologies.forEach((t) => list.push({ ...t, searchType: "technology" }));
    results.questions.forEach((q) => list.push({ ...q, searchType: "question" }));
    results.notes.forEach((n) => list.push({ ...n, searchType: "note" }));
    return list;
  };

  const handleSelect = (item: any) => {
    onClose();
    if (item.searchType === "technology") {
      router.push(`/technologies/${item.slug}`);
    } else if (item.searchType === "question") {
      router.push(`/technologies/${item.techSlug}?q=${item.id}`);
    } else if (item.searchType === "note") {
      router.push(`/notes?id=${item.id}`);
    }
  };

  const flatList = getFlatResults();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card/90 shadow-2xl backdrop-blur-2xl"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3.5">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions, answers, notes, technologies..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              )}
            </div>

            {/* Results body */}
            <div
              ref={resultsContainerRef}
              className="max-h-[50vh] overflow-y-auto p-2 space-y-4 scrollbar-thin"
            >
              {flatList.length > 0 ? (
                <div className="space-y-1">
                  {flatList.map((item, idx) => {
                    const isActive = idx === selectedIndex;
                    return (
                      <button
                        key={`${item.searchType}-${item.id || item.slug}`}
                        data-active={isActive}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all border border-transparent cursor-pointer",
                          isActive
                            ? "bg-primary/10 border-primary/20 text-foreground"
                            : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.searchType === "technology" && (
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                              <Code2 className="h-4 w-4" />
                            </div>
                          )}
                          {item.searchType === "question" && (
                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
                              <HelpCircle className="h-4 w-4" />
                            </div>
                          )}
                          {item.searchType === "note" && (
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                          )}
                          
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate text-foreground">
                              {item.name || item.title}
                            </p>
                            <p className="text-xs text-muted-foreground/80 mt-0.5 truncate flex items-center gap-1.5">
                              <span className="capitalize">{item.searchType}</span>
                              {item.techName && (
                                <>
                                  <span className="text-[10px] opacity-40">•</span>
                                  <span>{item.techName}</span>
                                </>
                              )}
                              {item.difficulty && (
                                <>
                                  <span className="text-[10px] opacity-40">•</span>
                                  <span className={cn(
                                    "font-bold text-[10px] uppercase",
                                    item.difficulty === "EASY" && "text-green-500",
                                    item.difficulty === "MEDIUM" && "text-yellow-500",
                                    item.difficulty === "HARD" && "text-red-500"
                                  )}>
                                    {item.difficulty}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {isActive && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 shrink-0 bg-muted px-1.5 py-0.5 rounded border border-border">
                            <span>Go to</span>
                            <CornerDownLeft className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="text-center py-12 text-muted-foreground text-sm space-y-1">
                  <p className="font-semibold">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-muted-foreground/60">Try searching for keywords, code snippets, or notes.</p>
                </div>
              ) : (
                // Helpful hints/prompts when search is empty
                <div className="p-4 space-y-4 text-muted-foreground">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-2">
                      Suggested Searches
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { label: "JavaScript Runtime", query: "JavaScript" },
                        { label: "Event Loop workings", query: "Event Loop" },
                        { label: "Spaced Repetition Questions", query: "Revision" },
                        { label: "My cheat sheets", query: "Cheat" },
                      ].map((s) => (
                        <button
                          key={s.label}
                          onClick={() => setQuery(s.query)}
                          className="text-left text-xs bg-muted/40 hover:bg-muted/70 px-3 py-2 rounded-xl border border-border/30 hover:border-border transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-4 flex items-center justify-between text-[11px] text-muted-foreground/60">
                    <div className="flex items-center gap-3">
                      <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border">↑↓</kbd> Navigate</span>
                      <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border">↵</kbd> Open</span>
                      <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border">esc</kbd> Dismiss</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
