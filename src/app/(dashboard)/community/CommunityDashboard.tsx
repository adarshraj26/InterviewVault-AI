"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Heart, Search, Users, Copy, Check, Globe, Info, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { toggleLikeQuestion, toggleBookmarkQuestion } from "@/actions/questions";
import Link from "next/link";
import { toast } from "sonner";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-500/10 text-green-500 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  HARD: "bg-red-500/10 text-red-500 border-red-500/20",
};

interface QuestionItem {
  id: string;
  title: string;
  answer: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  technology: {
    name: string;
  };
  user: {
    name: string | null;
    email: string;
  };
  tags: string[];
  likes: { userId: string }[];
  bookmarks: { userId: string }[];
}

export default function CommunityDashboard({ 
  initialQuestions,
  currentUserId 
}: { 
  initialQuestions: any[];
  currentUserId: string;
}) {
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [search, setSearch] = useState("");
  const [selectedTech, setSelectedTech] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique technology filters
  const techFilters = ["All", ...Array.from(new Set(questions.map((q) => q.technology.name)))];

  // Filtered list
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) || 
                          (q.answer?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
                          q.technology.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesTech = selectedTech === "All" || q.technology.name === selectedTech;
    
    return matchesSearch && matchesTech;
  });

  const handleLike = async (id: string) => {
    try {
      const res = await toggleLikeQuestion(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      
      setQuestions((prev) => 
        prev.map((q) => {
          if (q.id === id) {
            const hasLiked = q.likes.some((l) => l.userId === currentUserId);
            return {
              ...q,
              likes: hasLiked 
                ? q.likes.filter((l) => l.userId !== currentUserId) 
                : [...q.likes, { userId: currentUserId }],
            };
          }
          return q;
        })
      );
    } catch (e) {
      toast.error("Failed to update like");
    }
  };

  const handleBookmark = async (id: string) => {
    try {
      const res = await toggleBookmarkQuestion(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      setQuestions((prev) => 
        prev.map((q) => {
          if (q.id === id) {
            const hasBookmarked = q.bookmarks.some((b) => b.userId === currentUserId);
            return {
              ...q,
              bookmarks: hasBookmarked 
                ? q.bookmarks.filter((b) => b.userId !== currentUserId) 
                : [...q.bookmarks, { userId: currentUserId }],
            };
          }
          return q;
        })
      );
      toast.success("Bookmark updated!");
    } catch (e) {
      toast.error("Failed to update bookmark");
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Question title copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Community Library</h1>
          <p className="text-muted-foreground mt-1">Discover and save questions shared by the community</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-center gap-2 glass rounded-xl px-4 py-2 w-full sm:w-auto">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{questions.length} community questions</span>
          </div>
          <Link
            href="/technologies"
            className="flex items-center justify-center gap-2 gradient-bg text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 text-sm font-semibold w-full sm:w-auto"
          >
            <Globe className="h-4 w-4" />
            Share a Question
          </Link>
        </div>
      </div>

      {/* How-to-share info banner */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3.5">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">How to share your questions:</span>{" "}
          Open any technology workspace → find a question → click the{" "}
          <span className="inline-flex items-center gap-1 bg-muted border border-border rounded-md px-1.5 py-0.5 text-[10px] font-bold text-foreground mx-0.5">
            <Globe className="h-2.5 w-2.5" /> EyeOff
          </span>{" "}
          icon on the right side of the question card. It turns green when the question is public and visible here.
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search community questions..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-black/10 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" 
          />
        </div>
      </div>

      {/* Tech filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {techFilters.map((filter) => {
          const isSelected = selectedTech === filter;
          return (
            <button
              key={filter}
              onClick={() => setSelectedTech(filter)}
              className={cn(
                "relative px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                isSelected ? "text-white font-semibold" : "glass hover:bg-muted text-muted-foreground"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="community-tech-filter"
                  className="absolute inset-0 rounded-xl gradient-bg shadow-lg shadow-primary/25 z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{filter}</span>
            </button>
          );
        })}
      </div>

      {/* Questions Grid */}
      {filteredQuestions.length === 0 ? (
        <GlassCard className="p-10 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">No community questions yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Be the first to share! Open one of your technology workspaces, find a question you&apos;ve prepared,
              and click the globe icon to make it public.
            </p>
          </div>
          <Link
            href="/technologies"
            className="inline-flex items-center gap-2 gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Go to My Workspaces
            <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((q) => {
            const isLiked = q.likes.some((l) => l.userId === currentUserId);
            const isBookmarked = q.bookmarks.some((b) => b.userId === currentUserId);

            return (
              <motion.div
                key={q.id}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
              >
                <GlassCard hover className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm leading-snug flex-1">{q.title}</h3>
                      <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border", difficultyColors[q.difficulty])}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{q.technology.name}</span>
                      {q.tags.map((tag) => (
                        <span key={tag} className="text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                          {tag.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">by {q.user.name || q.user.email.split("@")[0]}</span>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleLike(q.id)}
                        className={cn(
                          "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer",
                          isLiked ? "border-rose-500/30 bg-rose-500/10 text-rose-500" : "border-border/60 hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                        <span>{q.likes.length}</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleBookmark(q.id)}
                        className={cn(
                          "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer",
                          isBookmarked ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-500" : "border-border/60 hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
