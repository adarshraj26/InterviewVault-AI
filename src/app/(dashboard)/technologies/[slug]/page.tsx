"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Code2,
  Copy,
  Plus,
  Search,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Trash,
  Trash2,
  Pencil,
  Globe,
  EyeOff,
  FileText,
  FileArchive,
  GitBranch,
  Edit3,
  CheckSquare,
  Square,
  X,
  MinusSquare,
  BookOpen,
  Clock,
  Eye,
  FileCode,
  Type,
  LayoutGrid,
  List,
  Upload,
  Shield,
  User,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { GlassCard, RichTextEditor, MarkdownRenderer, QuestionDetailView, isMarkdownContent, ConfirmDeleteButton, CustomSelect } from "@/components/shared";
import { cn, stripMarkdown } from "@/lib/utils";
import { getTechnologyBySlug, updateTechnology } from "@/actions/technologies";
import { createQuestion, generateAIQuestions, deleteQuestion, deleteMultipleQuestions, updateQuestion, toggleQuestionPublic, formatAnswerAction, recordRevision } from "@/actions/questions";
import { saveToMyVault } from "@/actions/ownership";
import { toast } from "sonner";
import { TECH_ICONS } from "@/constants";
import { BulkImportModal } from "./BulkImportModal";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";

/** Returns true if the string contains HTML tags (rich-text answer). */
function isHtmlContent(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function estimateReadTime(text: string): number {
  const words = text.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}


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
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  python: "Python",
  py: "Python",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  java: "Java",
  cpp: "C++",
  "c++": "C++",
};

function highlightCode(code: string, language: string): string {
  if (!code) return "";
  
  let lang = (language || "").toLowerCase().trim();
  if (lang === "js") lang = "javascript";
  if (lang === "ts") lang = "typescript";
  if (lang === "py") lang = "python";
  if (lang === "c++") lang = "cpp";
  
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
  const searchParams = useSearchParams();
  const questionIdParam = searchParams.get("q");
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN";
  const [savingToVault, setSavingToVault] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [tech, setTech] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [showAllFilterTags, setShowAllFilterTags] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  
  // Layout View: grid or list
  const [layoutView, setLayoutView] = useState<"grid" | "list">("grid");
  // Pagination & Sorting
  const [pageSize, setPageSize] = useState<number | "all">(9);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<string>("default");

  // Copied states
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
  const [availableTags, setAvailableTags] = useState<string[]>([
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "FREQUENTLY_ASKED",
  ]);
  const [newTag, setNewTag] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedAvailableTags = useMemo(() => {
    return [...availableTags]
      .map(tag => ({
        tag,
        count: questions.filter((q) => q.tags && q.tags.includes(tag)).length
      }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [availableTags, questions]);

  const visibleTags = useMemo(() => {
    if (showAllFilterTags) return sortedAvailableTags;
    return sortedAvailableTags.filter((t, idx) => idx < 10 || selectedFilterTags.includes(t.tag));
  }, [sortedAvailableTags, showAllFilterTags, selectedFilterTags]);

  const activeFiltersCount = (difficultyFilter !== "ALL" ? 1 : 0) + selectedFilterTags.length;

  // Edit Technology Workspace states
  const [isEditTechModalOpen, setIsEditTechModalOpen] = useState(false);
  const [editTechName, setEditTechName] = useState("");
  const [editTechDesc, setEditTechDesc] = useState("");
  const [techSubmitting, setTechSubmitting] = useState(false);

  // AI Generation state
  const [generating, setGenerating] = useState(false);

  // Multi-select bulk delete states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Bulk import states
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportSource, setBulkImportSource] = useState<"markdown" | "paste" | "github" | "zip">("markdown");
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

  const [formattingId, setFormattingId] = useState<string | null>(null);
  const [detailViewQuestion, setDetailViewQuestion] = useState<any | null>(null);
  const [editorMode, setEditorMode] = useState<"richtext" | "markdown">("markdown");
  const [markdownPreview, setMarkdownPreview] = useState(false);

  // Spaced Repetition Practice Session States
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [practiceStack, setPracticeStack] = useState<any[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [practiceDone, setPracticeDone] = useState(false);

  const handleStartPractice = () => {
    if (questions.length === 0) {
      toast.error("Add some questions first to start practicing!");
      return;
    }
    
    // Sort stack: due questions first, then the rest
    const now = new Date();
    const due = questions.filter((q) => {
      const lastRec = q.revisionRecords?.[0];
      return q.revisionStatus !== "MASTERED" && (!lastRec?.nextReviewAt || new Date(lastRec.nextReviewAt) <= now);
    });
    
    const others = questions.filter((q) => !due.includes(q));
    const stack = [...due, ...others];
    
    setPracticeStack(stack);
    setPracticeIndex(0);
    setRevealAnswer(false);
    setPracticeDone(false);
    setIsPracticeOpen(true);
  };

  const handlePracticeGrade = async (quality: number) => {
    const q = practiceStack[practiceIndex];
    toast.loading("Saving grade...", { id: "practice-grade" });
    
    try {
      const res = await recordRevision(q.id, quality);
      if (res.error) {
        toast.error(res.error, { id: "practice-grade" });
        return;
      }
      toast.success("Review recorded!", { id: "practice-grade" });
      
      // Advance or finish
      if (practiceIndex < practiceStack.length - 1) {
        setPracticeIndex((prev) => prev + 1);
        setRevealAnswer(false);
      } else {
        setPracticeDone(true);
      }
      
      loadData(); // reload data in background to refresh status badges
    } catch (err) {
      toast.error("Failed to save grade", { id: "practice-grade" });
    }
  };

  const handleFormatAnswer = async (questionId: string) => {
    setFormattingId(questionId);
    toast.loading("AI is formatting the answer...", { id: `format-answer-${questionId}` });
    try {
      const res = await formatAnswerAction(questionId);
      if (res.error) {
        toast.error(res.error, { id: `format-answer-${questionId}` });
        return;
      }
      toast.success("Answer formatted successfully!", { id: `format-answer-${questionId}` });
      
      // Update local questions list
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId ? { ...item, answer: res.answer } : item
        )
      );
    } catch (err) {
      toast.error("Failed to format answer", { id: `format-answer-${questionId}` });
    } finally {
      setFormattingId(null);
    }
  };

  const handleStartBulkImport = (src: "markdown" | "paste" | "github" | "zip") => {
    setBulkImportSource(src);
    setIsBulkImportOpen(true);
  };

  const handleDeleteQuestion = async (id: string, title: string) => {
    toast.loading("Deleting question...", { id: "delete-question" });
    try {
      const res = await deleteQuestion(id);
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

  // Multi-select helpers
  const toggleSelectMode = () => {
    if (isSelectMode) {
      setSelectedIds(new Set());
    }
    setIsSelectMode(!isSelectMode);
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const executeBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteConfirm(false);
    setIsBulkDeleting(true);
    
    const count = selectedIds.size;
    toast.loading(`Deleting ${count} question${count > 1 ? "s" : ""}...`, { id: "bulk-delete" });
    try {
      const res = await deleteMultipleQuestions(Array.from(selectedIds));
      if (res.error) {
        toast.error(res.error, { id: "bulk-delete" });
        return;
      }
      toast.success(`Successfully deleted ${res.count} question${(res.count ?? 0) > 1 ? "s" : ""}!`, { id: "bulk-delete" });
      setSelectedIds(new Set());
      setIsSelectMode(false);
      loadData();
    } catch (err) {
      toast.error("Failed to delete questions", { id: "bulk-delete" });
    } finally {
      setIsBulkDeleting(false);
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

  useEffect(() => {
    if (questionIdParam && questions.length > 0) {
      const matched = questions.find((q) => q.id === questionIdParam);
      if (matched) {
        setDetailViewQuestion(matched);
      }
    }
  }, [questionIdParam, questions]);

  const isReadOnly = tech?.isGlobalTemplate && tech?.userId !== (session?.user as any)?.id;

  const handleCreatePersonalCopy = async () => {
    if (!tech) return;
    setIsCloning(true);
    toast.loading("Creating your personal copy...", { id: "clone" });
    try {
      const { createPersonalCopy } = await import("@/actions/template-provisioning");
      const res = await createPersonalCopy(tech.id);
      
      if (res.error) {
        toast.error(res.error, { id: "clone" });
        return;
      }
      
      toast.success("Personal copy created! You can now edit and add questions.", { id: "clone" });
      loadData(); // Will now load the personal copy
    } catch (err) {
      toast.error("Failed to create copy", { id: "clone" });
    } finally {
      setIsCloning(false);
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      const allTags = new Set([
        "BEGINNER",
        "INTERMEDIATE",
        "ADVANCED",
        "FREQUENTLY_ASKED",
      ]);
      questions.forEach((q) => {
        if (q.tags) {
          q.tags.forEach((t: string) => {
            if (t) allTags.add(t);
          });
        }
      });
      setAvailableTags(Array.from(allTags));
    }
  }, [questions]);

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
    setEditorMode("markdown");
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
    
    // Auto-detect editor mode based on content format
    if (q.answer && isHtmlContent(q.answer)) {
      setEditorMode("richtext");
    } else {
      setEditorMode("markdown");
    }
    
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
          answer: answer.trim() || null,
          codeExample: editorMode === "markdown" ? null : (codeExample.trim() || null),
          codeLanguage: editorMode === "markdown" ? null : (codeExample.trim() ? codeLanguage : null),
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
          answer: answer.trim() || null,
          codeExample: editorMode === "markdown" ? null : (codeExample.trim() || null),
          codeLanguage: editorMode === "markdown" ? null : (codeExample.trim() ? codeLanguage : null),
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
    } catch (err: any) {
      toast.error(err?.message || (editTarget ? "Failed to update question" : "Failed to create question"));
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

  const handleAddCustomTag = () => {
    const cleaned = newTag.trim();
    if (!cleaned) return;

    const formattedTag = cleaned.toUpperCase().replace(/[\s-]+/g, "_");
    
    if (!availableTags.includes(formattedTag)) {
      setAvailableTags((prev) => [...prev, formattedTag]);
    }
    
    if (!selectedTags.includes(formattedTag)) {
      setSelectedTags((prev) => [...prev, formattedTag]);
    }
    
    setNewTag("");
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.answer && q.answer.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDifficulty =
      difficultyFilter === "ALL" || q.difficulty === difficultyFilter;

    const matchesTags =
      selectedFilterTags.length === 0 ||
      selectedFilterTags.every((t) => q.tags && q.tags.includes(t));

    return matchesSearch && matchesDifficulty && matchesTags;
  });

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (sortOption === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOption === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortOption === "title-asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortOption === "difficulty-asc") {
      const order = { EASY: 1, MEDIUM: 2, HARD: 3 };
      return (order[a.difficulty as keyof typeof order] || 0) - (order[b.difficulty as keyof typeof order] || 0);
    }
    if (sortOption === "difficulty-desc") {
      const order = { EASY: 1, MEDIUM: 2, HARD: 3 };
      return (order[b.difficulty as keyof typeof order] || 0) - (order[a.difficulty as keyof typeof order] || 0);
    }
    return 0; // Default sorting (createdAt asc from Prisma)
  });

  const totalItems = sortedQuestions.length;
  const numericPageSize = pageSize === "all" ? totalItems : pageSize;
  const totalPages = Math.ceil(totalItems / numericPageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * numericPageSize;
  const endIndex = Math.min(startIndex + numericPageSize, totalItems);
  const paginatedQuestions = sortedQuestions.slice(startIndex, endIndex);

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

  const now = new Date();
  const dueQuestions = questions.filter((q) => {
    const lastRec = q.revisionRecords?.[0];
    return q.revisionStatus !== "MASTERED" && (!lastRec?.nextReviewAt || new Date(lastRec.nextReviewAt) <= now);
  });
  const dueCount = dueQuestions.length;

  return (
    <>
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
                {tech.sourceTemplateId && !tech.isGlobalTemplate && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400">
                    <User className="h-3 w-3" /> Personal Copy
                  </span>
                )}
                {!isReadOnly && (
                  <button
                    onClick={handleStartEditTech}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Edit Technology Workspace"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              {tech.description && (
                <p className="text-sm text-muted-foreground/80 mt-1.5 max-w-2xl leading-relaxed">
                  {tech.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-2">
                {questions.length} questions · {masteredCount} mastered · {progressPercent}% ready
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {questions.length > 0 && (
              dueCount > 0 ? (
                <button
                  type="button"
                  onClick={handleStartPractice}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary transition-all text-sm font-semibold cursor-pointer shadow-lg shadow-primary/10 relative h-9 whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span>Practice Due</span>
                  <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {dueCount}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartPractice}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border glass hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-sm font-semibold cursor-pointer h-9 whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Practice Cards</span>
                </button>
              )
            )}
            
            {isReadOnly ? (
              <button
                onClick={handleCreatePersonalCopy}
                disabled={isCloning}
                className="flex items-center gap-2 gradient-bg text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-primary/25 text-sm font-semibold cursor-pointer h-9 whitespace-nowrap disabled:opacity-50"
              >
                {isCloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Create Personal Copy
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleStartBulkImport("markdown")}
                  className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground border border-border px-4 py-2 rounded-lg transition-all text-sm font-semibold cursor-pointer h-9 whitespace-nowrap"
                  title="Import questions from Markdown, Text, PDF, or DOCX"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Questions</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                    className="flex items-center gap-2 gradient-bg text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-primary/25 text-sm font-semibold cursor-pointer h-9 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    Add Content
                  </button>
                  {isAddDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsAddDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-[#0b0f19] p-1.5 shadow-2xl z-20 space-y-1">
                        <button
                          onClick={() => {
                            setIsAddDropdownOpen(false);
                            handleStartAddQuestion();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-foreground/90"
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                          Add Question
                        </button>
                        <button
                          onClick={() => {
                            setIsAddDropdownOpen(false);
                            handleStartBulkImport("markdown");
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-foreground/90"
                        >
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          Import Markdown
                        </button>
                        <button
                          onClick={() => {
                            setIsAddDropdownOpen(false);
                            handleStartBulkImport("paste");
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-foreground/90"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-primary" />
                          Bulk Paste
                        </button>
                        <button
                          onClick={() => {
                            setIsAddDropdownOpen(false);
                            handleStartBulkImport("zip");
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-foreground/90"
                        >
                          <FileArchive className="h-3.5 w-3.5 text-primary" />
                          Import ZIP
                        </button>
                        <button
                          onClick={() => {
                            setIsAddDropdownOpen(false);
                            handleStartBulkImport("github");
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-foreground/90"
                        >
                          <GitBranch className="h-3.5 w-3.5 text-primary" />
                          Import GitHub Repository
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filters, Page Size & Layout Toggles */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/20 relative">
        {/* Left: Collapsible Filter Popover Menu */}
        <div className="relative">
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer h-9",
              activeFiltersCount > 0
                ? "bg-primary/10 border-primary/40 text-primary shadow-lg shadow-primary/5"
                : "glass border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filter Menu</span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center bg-primary text-white text-[10px] font-bold h-4.5 min-w-4.5 px-1.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isFilterMenuOpen && (
              <>
                {/* Backdrop overlay to close when click outside */}
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-[#0b0f19]/95 backdrop-blur-xl p-4 shadow-2xl z-50 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin"
                >
                  {/* Difficulty Section */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Difficulty Level
                    </h4>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "All", value: "ALL" },
                        { label: "Easy", value: "EASY" },
                        { label: "Med", value: "MEDIUM" },
                        { label: "Hard", value: "HARD" },
                      ].map((tab) => {
                        const count = questions.filter(
                          (q) => (tab.value === "ALL" || q.difficulty === tab.value)
                        ).length;
                        const isSelected = difficultyFilter === tab.value;
                        return (
                          <button
                            key={tab.value}
                            onClick={() => {
                              setDifficultyFilter(tab.value);
                              setCurrentPage(1);
                            }}
                            className={cn(
                              "py-1.5 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer",
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-muted/40 hover:bg-muted/60 text-muted-foreground"
                            )}
                          >
                            <div>{tab.label}</div>
                            <div className="text-[9px] opacity-60 font-medium">({count})</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                        Filter by Tags
                      </h4>
                      {selectedFilterTags.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedFilterTags([]);
                            setCurrentPage(1);
                          }}
                          className="text-[10px] text-destructive hover:underline font-bold"
                        >
                          Clear Tags
                        </button>
                      )}
                    </div>

                    {/* Inside-popover Tag search input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder="Search tags..."
                        className="w-full rounded-lg border border-border/50 bg-card pl-8 pr-3 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary focus:border-transparent"
                      />
                      {tagSearchQuery && (
                        <button
                          onClick={() => setTagSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Tag Pills List */}
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1 scrollbar-thin">
                      {sortedAvailableTags
                        .filter(({ tag }) =>
                          tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
                        )
                        .map(({ tag, count }) => {
                          const isSelected = selectedFilterTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => {
                                setSelectedFilterTags((prev) =>
                                  prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                                );
                                setCurrentPage(1);
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 border cursor-pointer select-none flex items-center gap-1",
                                isSelected
                                  ? "bg-primary/20 border-primary text-primary"
                                  : "bg-muted/30 hover:bg-muted/50 border-border/50 text-muted-foreground"
                              )}
                            >
                              <span>#{tag.replace("_", " ")}</span>
                              <span className="text-[9px] opacity-60">({count})</span>
                            </button>
                          );
                        })}
                      {sortedAvailableTags.filter(({ tag }) =>
                        tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <p className="text-[11px] text-muted-foreground/60 py-2">No tags match search query.</p>
                      )}
                    </div>
                  </div>

                  {/* Clear all filter option */}
                  {activeFiltersCount > 0 && (
                    <div className="border-t border-border/40 pt-2.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[10px]">
                        {activeFiltersCount} filter(s) active
                      </span>
                      <button
                        onClick={() => {
                          setDifficultyFilter("ALL");
                          setSelectedFilterTags([]);
                          setCurrentPage(1);
                        }}
                        className="text-destructive hover:underline font-bold text-[10px]"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Page Size & Layout view switch */}
        <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
          {/* Show X per page */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider text-[10px]">Show</span>
            <CustomSelect
              value={pageSize}
              onChange={(val) => {
                setPageSize(val);
                setCurrentPage(1);
              }}
              options={[
                { value: 9, label: "9 per page" },
                { value: 18, label: "18 per page" },
                { value: 27, label: "27 per page" },
                { value: "all", label: "All questions" },
              ]}
              className="w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Layout View</span>
            <div className="flex items-center p-0.5 rounded-xl bg-black/20 border border-border/50">
              <button
                type="button"
                onClick={() => setLayoutView("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  layoutView === "grid"
                    ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutView("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  layoutView === "list"
                    ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      {/* Search Bar & Sorting */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={`Search ${tech.name} questions...`}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <CustomSelect
            value={sortOption}
            onChange={(val) => setSortOption(val)}
            options={[
              { value: "default", label: "Default Sorting" },
              { value: "newest", label: "Newest First" },
              { value: "oldest", label: "Oldest First" },
              { value: "title-asc", label: "Title (A-Z)" },
              { value: "difficulty-asc", label: "Difficulty (Easy to Hard)" },
              { value: "difficulty-desc", label: "Difficulty (Hard to Easy)" },
            ]}
            className="w-56"
          />

          {/* Multi-select toggle */}
          {questions.length > 0 && (
            <button
              onClick={toggleSelectMode}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border whitespace-nowrap",
                isSelectMode
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "glass border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              )}
              title={isSelectMode ? "Exit selection mode" : "Select multiple questions"}
            >
              {isSelectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              {isSelectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>
      </motion.div>

      {/* Select All bar + floating action bar */}
      <AnimatePresence>
        {isSelectMode && filteredQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl glass border border-border/80 bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-semibold text-foreground/90 hover:text-primary transition-colors cursor-pointer"
              >
                {selectedIds.size === filteredQuestions.length ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : selectedIds.size > 0 ? (
                  <MinusSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedIds.size === filteredQuestions.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} of {filteredQuestions.length} selected
              </span>
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkDeleting}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isBulkDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete {selectedIds.size} Question{selectedIds.size > 1 ? "s" : ""}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions Render (Grid/List Conditional) */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12 bg-card/20 border border-border/50 rounded-2xl p-8">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-semibold text-base mb-1">No questions found</h3>
          <p className="text-sm text-muted-foreground">
            {questions.length === 0
              ? "This workspace has no questions yet. Click Add Content to get started."
              : "No questions match your search or filters."}
          </p>
        </div>
      ) : layoutView === "grid" ? (
        /* Grid View Layout */
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {paginatedQuestions.map((q, index) => {
            const cleanAnswer = stripMarkdown(q.answer);
              
            return (
              <motion.div
                key={q.id}
                variants={fadeInUp}
                onClick={() => {
                  if (isSelectMode) {
                    toggleSelectQuestion(q.id);
                  } else {
                    setDetailViewQuestion(q);
                  }
                }}
                className="group relative cursor-pointer"
              >
                <GlassCard hover className={cn(
                  "h-full flex flex-col justify-between overflow-hidden p-6 relative group border transition-all duration-300",
                  isSelectMode && selectedIds.has(q.id) ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/5" : "border-border/60 hover:border-primary/40"
                )}>
                  <div>
                    {/* Header: Tech Name and Difficulty */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {isSelectMode && (
                          <span className="p-0.5 text-primary shrink-0 transition-colors">
                            {selectedIds.has(q.id) ? (
                              <CheckSquare className="h-4.5 w-4.5 text-primary" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-muted-foreground hover:text-primary" />
                            )}
                          </span>
                        )}
                        <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                          {tech.name}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        q.difficulty === "EASY"
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : q.difficulty === "HARD"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                      )}>
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Question Title */}
                    <h3 className="text-base font-bold mb-3 line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-snug">
                      {q.title}
                    </h3>

                    {/* Answer Snippet */}
                    <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed mb-6">
                      {cleanAnswer || "No answer explanation provided."}
                    </p>
                  </div>

                  {/* Card Footer: Tags & Info */}
                  <div className="mt-auto space-y-3 pt-3 border-t border-border/30">
                    <div className="flex flex-wrap gap-1.5">
                      {q.tags && q.tags.slice(0, 2).map((tag: string) => (
                        <span 
                          key={tag} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFilterTags((prev) =>
                              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                            );
                            setCurrentPage(1);
                          }}
                          className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20 hover:border-primary/30 transition-all cursor-pointer select-none"
                        >
                          {tag.replace("_", " ")}
                        </span>
                      ))}
                      <span className="text-[9px] font-semibold text-muted-foreground self-center ml-auto">
                        {q.interviewFrequency === "VERY_COMMON" ? "🔥 Very Common" : q.interviewFrequency === "COMMON" ? "📌 Common" : "💤 Rare"}
                      </span>
                    </div>

                    {/* Inline edit/delete actions */}
                    <div className="flex items-center justify-between pt-1 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <span className="text-[10px] text-primary/70 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Read full article <ArrowRight className="h-3 w-3" />
                      </span>
                      {!isReadOnly && (
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {/* Share to Community toggle */}
                          <button
                            onClick={() => handleTogglePublic(q)}
                            className={cn(
                              "p-1 rounded transition-colors cursor-pointer border",
                              q.isPublic
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                                : "bg-indigo-500/[0.06] dark:bg-indigo-500/10 border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600/80 dark:text-indigo-400/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-500"
                            )}
                            title={q.isPublic ? "Remove from Community Library" : "Share to Community Library"}
                          >
                            {q.isPublic ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>

                          <button
                            onClick={() => handleStartEditQuestion(q)}
                            className="p-1 rounded bg-amber-500/[0.06] dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 text-amber-600/80 dark:text-amber-400/80 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <ConfirmDeleteButton
                            onDelete={() => handleDeleteQuestion(q.id, q.title)}
                            className="w-6 h-6 rounded-full bg-rose-500/[0.06] dark:bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/30 text-rose-600/80 dark:text-rose-400/80 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            tooltip="Delete"
                            icon={<Trash className="h-3 w-3" />}
                            confirmIcon={<AlertCircle className="h-3 w-3 animate-pulse" />}
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* List View Layout */
        <motion.div variants={staggerContainer} className="space-y-3">
          {paginatedQuestions.map((q, index) => (
            <motion.div key={q.id} id={`question-${q.id}`} variants={fadeInUp}>
              <GlassCard className="p-0 overflow-hidden">
                <div
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelectQuestion(q.id);
                    } else {
                      setDetailViewQuestion(q);
                    }
                  }}
                  className={cn(
                    "w-full text-left p-5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer",
                    isSelectMode && selectedIds.has(q.id) && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      {isSelectMode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectQuestion(q.id);
                          }}
                          className="shrink-0 cursor-pointer p-0.5 transition-colors"
                        >
                          {selectedIds.has(q.id) ? (
                            <CheckSquare className="h-4.5 w-4.5 text-primary" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-bold text-muted-foreground/60 w-6 text-right tabular-nums">{startIndex + index + 1}.</span>
                      )}
                      <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors">{q.title}</h3>
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
                        <span 
                          key={tag} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFilterTags((prev) =>
                              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                            );
                            setCurrentPage(1);
                          }}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer select-none"
                        >
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
                    {!isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePublic(q);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg border transition-all cursor-pointer z-10",
                          q.isPublic
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                            : "border-indigo-500/20 dark:border-indigo-500/30 bg-indigo-500/[0.06] dark:bg-indigo-500/10 text-indigo-600/80 dark:text-indigo-400/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-500"
                        )}
                        title={q.isPublic ? "Remove from Community Library" : "Share to Community Library"}
                      >
                        {q.isPublic ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {!isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditQuestion(q);
                        }}
                        className="p-1.5 rounded-lg border border-amber-500/20 dark:border-amber-500/30 bg-amber-500/[0.06] dark:bg-amber-500/10 hover:bg-amber-500/15 hover:border-amber-500/40 text-amber-600/80 dark:text-amber-400/80 hover:text-amber-500 dark:hover:text-amber-400 transition-all cursor-pointer z-10"
                        title="Edit Question"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isReadOnly && (
                      <ConfirmDeleteButton
                        onDelete={() => handleDeleteQuestion(q.id, q.title)}
                        className="w-7 h-7 border border-rose-500/20 dark:border-rose-500/30 bg-rose-500/[0.06] dark:bg-rose-500/10 hover:bg-rose-500/15 hover:border-rose-500/40 text-rose-600/80 dark:text-rose-400/80 hover:text-rose-500 dark:hover:text-rose-400 transition-all cursor-pointer z-10"
                        tooltip="Delete Question"
                      />
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <motion.div
          variants={fadeInUp}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/30 mt-8"
        >
          <span className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span> questions
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage === 1}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold glass border border-border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-all"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => {
              const pNum = i + 1;
              if (totalPages > 6 && Math.abs(activePage - pNum) > 1 && pNum !== 1 && pNum !== totalPages) {
                if (pNum === 2 || pNum === totalPages - 1) {
                  return <span key={pNum} className="text-xs text-muted-foreground px-1" style={{ pointerEvents: 'none' }}>...</span>;
                }
                return null;
              }
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={cn(
                    "w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activePage === pNum
                      ? "gradient-bg text-white shadow-md shadow-primary/25"
                      : "glass border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage === totalPages}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold glass border border-border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-all"
            >
              Next
            </button>
          </div>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium">Answer</label>
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/20 border border-border/50">
                      <button
                        type="button"
                        onClick={() => {
                          setEditorMode("markdown");
                          setMarkdownPreview(false);
                          setCodeExample("");
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                          editorMode === "markdown"
                            ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <FileCode className="h-3 w-3" />
                        Markdown
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode("richtext")}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                          editorMode === "richtext"
                            ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Type className="h-3 w-3" />
                        Rich Text
                      </button>
                    </div>
                  </div>

                  {editorMode === "markdown" ? (
                    <div className="space-y-2">
                      {/* Markdown toolbar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>Use</span>
                          <code className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono"># Heading</code>
                          <code className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">```js```</code>
                          <code className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">&gt; quote</code>
                          <code className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">**bold**</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMarkdownPreview(!markdownPreview)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border",
                            markdownPreview
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </button>
                      </div>

                      {markdownPreview ? (
                        <div className="min-h-[140px] max-h-[400px] overflow-y-auto rounded-xl border border-border bg-black/10 p-4">
                          {answer.trim() ? (
                            <MarkdownRenderer content={answer} />
                          ) : (
                            <p className="text-sm text-muted-foreground/50 italic">Nothing to preview yet...</p>
                          )}
                        </div>
                      ) : (
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder={`# Question Title\n\nExplanation goes here...\n\n## Key Concept\n\n> Important interview point\n\n\`\`\`javascript\nconst example = "code here";\n\`\`\`\n\n- Point 1\n- Point 2`}
                          className="w-full min-h-[180px] rounded-xl border border-border bg-black/20 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all resize-y leading-relaxed"
                        />
                      )}
                    </div>
                  ) : (
                    <RichTextEditor
                      value={answer}
                      onChange={(html) => setAnswer(html)}
                      placeholder="Provide the comprehensive answer..."
                      minHeight="140px"
                    />
                  )}
                </div>

                {/* Code Example — only show when NOT in markdown mode */}
                {editorMode !== "markdown" && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Code Example (Optional)</label>
                    <textarea
                      value={codeExample}
                      onChange={(e) => setCodeExample(e.target.value)}
                      placeholder="Paste sample code snippet here..."
                      className="w-full h-24 rounded-xl border border-border bg-black/20 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all resize-none"
                    />
                  </div>
                )}
                {editorMode !== "markdown" && codeExample.trim() && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Code Language</label>
                    <CustomSelect
                      value={codeLanguage}
                      onChange={(val) => setCodeLanguage(val)}
                      options={[
                        { value: "javascript", label: "JavaScript" },
                        { value: "typescript", label: "TypeScript" },
                        { value: "python",     label: "Python" },
                        { value: "sql",        label: "SQL" },
                        { value: "html",       label: "HTML" },
                        { value: "css",        label: "CSS" },
                        { value: "java",       label: "Java" },
                        { value: "cpp",        label: "C++" },
                      ]}
                      className="w-full"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Difficulty</label>
                    <CustomSelect
                      value={difficulty}
                      onChange={(val) => setDifficulty(val as any)}
                      options={[
                        { value: "EASY",   label: "Easy",   color: "text-green-400" },
                        { value: "MEDIUM", label: "Medium", color: "text-yellow-400" },
                        { value: "HARD",   label: "Hard",   color: "text-red-400" },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Frequency</label>
                    <CustomSelect
                      value={frequency}
                      onChange={(val) => setFrequency(val as any)}
                      options={[
                        { value: "RARE",        label: "Rare" },
                        { value: "COMMON",      label: "Common" },
                        { value: "VERY_COMMON", label: "Very Common" },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Tags (Select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
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
                  {/* Custom tag input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add custom tag (e.g., React Hooks)"
                      className="flex-1 rounded-xl border border-border bg-black/20 px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0"
                    >
                      Add Tag
                    </button>
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



      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl glass-strong border border-red-500/30 p-6 shadow-2xl relative z-10 text-center"
            >
              <div className="p-3 bg-red-500/10 rounded-2xl w-fit mx-auto mb-4 border border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete {selectedIds.size} Question{selectedIds.size > 1 ? "s" : ""}?</h3>
              <p className="text-sm text-muted-foreground mb-2">
                This will permanently delete <span className="font-semibold text-red-400">{selectedIds.size} selected question{selectedIds.size > 1 ? "s" : ""}</span>. This action cannot be undone.
              </p>
              <div className="max-h-32 overflow-y-auto my-4 text-left bg-black/20 rounded-xl p-3 border border-border/50">
                {filteredQuestions
                  .filter(q => selectedIds.has(q.id))
                  .map((q, i) => (
                    <div key={q.id} className="text-xs text-muted-foreground py-0.5 truncate">
                      <span className="text-foreground/60 font-medium">{i + 1}.</span> {q.title}
                    </div>
                  ))}
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkDelete}
                  disabled={isBulkDeleting}
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-lg shadow-red-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isBulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>

      {/* Smart Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        initialSource={bulkImportSource}
        currentWorkspaceName={tech?.name}
        onImportComplete={loadData}
      />

      {/* FrontendPrep.io-style Full Article Detail View */}
      <AnimatePresence>
        {detailViewQuestion && (
          <QuestionDetailView
            question={detailViewQuestion}
            technologyName={tech?.name || ""}
            allQuestions={questions}
            isAdmin={isAdmin}
            onClose={() => setDetailViewQuestion(null)}
            onSelectQuestion={setDetailViewQuestion}
            onUpdateQuestion={(updatedQ) => {
              setDetailViewQuestion(updatedQ);
              setQuestions((prev) => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
            }}
          />
        )}
      </AnimatePresence>



      {/* ── Right-Side Sliding Practice Drawer ─────────────────────────── */}
      {/* Peek Tab — always visible on the right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center">
        <button
          type="button"
          onClick={() => {
            if (!isPracticeOpen) handleStartPractice();
            else setIsPracticeOpen(false);
          }}
          className={cn(
            "group flex flex-col items-center justify-center gap-1.5 py-5 px-2 rounded-l-2xl border border-r-0 border-border/60 shadow-2xl shadow-black/40 transition-all duration-300 cursor-pointer",
            isPracticeOpen
              ? "bg-primary text-white border-primary/60"
              : "bg-[#0b0f1a]/90 backdrop-blur-xl hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary"
          )}
          title={isPracticeOpen ? "Close Practice Panel" : "Open Practice Panel"}
        >
          {dueCount > 0 && !isPracticeOpen && (
            <span className="absolute -top-2 -left-2 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-background shadow-lg">
              {dueCount}
            </span>
          )}
          <Sparkles className={cn("h-4 w-4 transition-all", !isPracticeOpen && "animate-pulse")} />
          <span
            className="text-[9px] font-black uppercase tracking-widest leading-tight"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Practice
          </span>
          <motion.div
            animate={{ rotate: isPracticeOpen ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.div>
        </button>
      </div>

      {/* Practice Drawer Panel */}
      <AnimatePresence>
        {isPracticeOpen && (
          <>
            {/* Dimmed overlay — does NOT cover full screen, just the page content */}
            <motion.div
              key="practice-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsPracticeOpen(false)}
              className="fixed inset-0 z-[240] bg-black/40 backdrop-blur-[2px] cursor-pointer"
            />

            {/* Sliding Drawer */}
            <motion.div
              key="practice-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 35 }}
              className="fixed right-0 top-0 h-full z-[250] w-full max-w-md flex flex-col border-l border-border/60 bg-[#070b14]/95 backdrop-blur-2xl shadow-2xl shadow-black/50"
            >

              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span>Practice Session</span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{tech.name} · Active Recall & Spaced Repetition</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPracticeOpen(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer border border-transparent hover:border-border/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {!practiceDone && practiceStack.length > 0 ? (
                  <div className="flex flex-col gap-5">
                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Card {practiceIndex + 1} of {practiceStack.length}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          practiceStack[practiceIndex].revisionStatus === "MASTERED"
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : practiceStack[practiceIndex].revisionStatus === "LEARNING" || practiceStack[practiceIndex].revisionStatus === "REVISED_ONCE"
                              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                              : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                        )}>
                          {practiceStack[practiceIndex].revisionStatus === "NOT_STARTED" ? "New Card" : "Reviewing"}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          animate={{ width: `${((practiceIndex) / practiceStack.length) * 100}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="rounded-2xl bg-white/4 border border-border/60 p-6 flex flex-col justify-center min-h-[160px] relative overflow-hidden">
                      <div className="absolute top-3 left-4 text-[9px] font-bold text-primary/50 tracking-widest uppercase">{tech.name}</div>
                      <h4 className="text-lg font-bold text-center text-foreground leading-snug pt-4">
                        {practiceStack[practiceIndex].title}
                      </h4>
                    </div>

                    {/* Answer Reveal Area */}
                    <AnimatePresence mode="wait">
                      {!revealAnswer ? (
                        <motion.div
                          key="reveal-btn"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex justify-center py-3"
                        >
                          <button
                            type="button"
                            onClick={() => setRevealAnswer(true)}
                            className="px-6 py-3 rounded-xl gradient-bg text-white hover:opacity-90 transition-all font-semibold text-sm shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-2 w-full justify-center"
                          >
                            <Eye className="h-4 w-4" />
                            Reveal Answer
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="answer-content"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {/* Answer content */}
                          <div className="max-h-[260px] overflow-y-auto rounded-xl bg-black/30 border border-border/30 p-4 text-sm leading-relaxed">
                            {practiceStack[practiceIndex].answer ? (
                              isMarkdownContent(practiceStack[practiceIndex].answer) ? (
                                <MarkdownRenderer content={practiceStack[practiceIndex].answer} />
                              ) : isHtmlContent(practiceStack[practiceIndex].answer) ? (
                                <div
                                  className="rich-text-content"
                                  dangerouslySetInnerHTML={{ __html: practiceStack[practiceIndex].answer }}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap">{practiceStack[practiceIndex].answer}</p>
                              )
                            ) : (
                              <p className="text-muted-foreground italic">No answer explanation provided.</p>
                            )}
                            {practiceStack[practiceIndex].codeExample && (
                              <div className="mt-4 pt-4 border-t border-border/20">
                                <MarkdownRenderer
                                  content={`\`\`\`${practiceStack[practiceIndex].codeLanguage || "javascript"}\n${practiceStack[practiceIndex].codeExample}\n\`\`\``}
                                />
                              </div>
                            )}
                          </div>

                          {/* Rate recall */}
                          <div className="space-y-2.5">
                            <label className="block text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rate your recall:</label>
                            <div className="grid grid-cols-5 gap-1.5">
                              {[
                                { label: "Forgot", value: 1, color: "hover:bg-red-500 hover:text-white border-red-500/20 text-red-400 bg-red-500/5" },
                                { label: "Hard", value: 2, color: "hover:bg-orange-500 hover:text-white border-orange-500/20 text-orange-400 bg-orange-500/5" },
                                { label: "Okay", value: 3, color: "hover:bg-yellow-500 hover:text-black border-yellow-500/20 text-yellow-400 bg-yellow-500/5" },
                                { label: "Good", value: 4, color: "hover:bg-blue-500 hover:text-white border-blue-500/20 text-blue-400 bg-blue-500/5" },
                                { label: "Easy", value: 5, color: "hover:bg-green-500 hover:text-white border-green-500/20 text-green-400 bg-green-500/5" },
                              ].map((g) => (
                                <button
                                  key={g.value}
                                  type="button"
                                  onClick={() => handlePracticeGrade(g.value)}
                                  className={cn(
                                    "flex flex-col items-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer",
                                    g.color
                                  )}
                                >
                                  <span className="text-xs mb-0.5">{g.value}</span>
                                  <span>{g.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* Completion view */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center text-center space-y-4 py-16"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl animate-bounce">
                      🎉
                    </div>
                    <h4 className="text-xl font-bold text-foreground">Session Complete!</h4>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      You&apos;ve reviewed all{" "}
                      <span className="font-semibold text-primary">{practiceStack.length} questions</span>{" "}
                      in your <span className="font-semibold text-foreground">{tech.name}</span> workspace.
                    </p>
                    <p className="text-xs text-muted-foreground">Spaced repetition records updated.</p>
                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleStartPractice}
                        className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        Practice Again
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPracticeOpen(false)}
                        className="gradient-bg text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/25"
                      >
                        Close Panel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
