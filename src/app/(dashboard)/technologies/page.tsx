"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, SlidersHorizontal, Sparkles, Loader2, Trash2, Pencil, Upload, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { TECH_ICONS } from "@/constants";
import { getTechnologies, createTechnology, deleteTechnology, updateTechnology } from "@/actions/technologies";
import { importMarkdownQuestionsAction, recategorizeGeneralQuestionsAction } from "@/actions/questions";
import { toast } from "sonner";
import { BulkImportModal } from "./[slug]/BulkImportModal";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

interface TechnologyWithQuestions {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  questions: {
    revisionStatus: string;
  }[];
}

export default function TechnologiesPage() {
  const [techList, setTechList] = useState<TechnologyWithQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTechName, setNewTechName] = useState("");
  const [newTechDesc, setNewTechDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<TechnologyWithQuestions | null>(null);

  // Markdown Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [mdFile, setMdFile] = useState<File | null>(null);
  const [mdText, setMdText] = useState("");
  const [showMdPaste, setShowMdPaste] = useState(false);
  const [mdLoading, setMdLoading] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    
    toast.loading("Deleting workspace...", { id: "delete-tech" });
    try {
      const res = await deleteTechnology(target.id);
      if (res.error) {
        toast.error(res.error, { id: "delete-tech" });
        return;
      }
      toast.success("Workspace deleted successfully!", { id: "delete-tech" });
      loadTechnologies(); // Reload list
    } catch (err) {
      toast.error("Failed to delete workspace", { id: "delete-tech" });
    }
  };

  const loadTechnologies = async () => {
    try {
      const data = await getTechnologies();
      setTechList(data as any);
    } catch (err) {
      console.error("Failed to load technologies:", err);
      toast.error("Failed to load technologies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTechnologies();
  }, []);

  const handleStartCreateTech = () => {
    setEditTarget(null);
    setNewTechName("");
    setNewTechDesc("");
    setIsModalOpen(true);
  };

  const handleStartEditTech = (tech: TechnologyWithQuestions) => {
    setEditTarget(tech);
    setNewTechName(tech.name);
    setNewTechDesc(tech.description || "");
    setIsModalOpen(true);
  };

  const handleSubmitTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim()) return;

    setSubmitting(true);
    try {
      if (editTarget) {
        // Edit Mode
        const res = await updateTechnology(editTarget.id, newTechName, newTechDesc);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(`Technology "${newTechName}" updated successfully!`);
      } else {
        // Create Mode
        const res = await createTechnology(newTechName, newTechDesc);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(`Technology "${newTechName}" added successfully!`);
      }
      setIsModalOpen(false);
      setEditTarget(null);
      setNewTechName("");
      setNewTechDesc("");
      loadTechnologies(); // Reload list
    } catch (err) {
      toast.error(editTarget ? "Failed to update technology" : "Failed to add technology");
    } finally {
      setSubmitting(false);
    }
  };

  // Markdown Question List Import Handlers
  const handleStartImportQuestions = () => {
    setMdFile(null);
    setMdText("");
    setShowMdPaste(false);
    setIsImportModalOpen(true);
  };

  const handleMdBrowseClick = () => {
    mdFileInputRef.current?.click();
  };

  const handleMdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".md")) {
      toast.error("Please upload a Markdown (.md) file");
      return;
    }

    setMdFile(file);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string || "";
      setMdText(text);

      // Trigger automatic import
      toast.loading("Analyzing markdown and importing questions...", { id: "md-import" });
      try {
        const res = await importMarkdownQuestionsAction(text);
        if (res.error) {
          toast.error(res.error, { id: "md-import" });
          return;
        }
        toast.success(
          `Imported ${res.questionsImported} questions! Resolved/created ${res.workspacesCreated} workspace(s).`,
          { id: "md-import" }
        );
        setIsImportModalOpen(false);
        setMdFile(null);
        setMdText("");
        loadTechnologies(); // Reload technologies grid to show any newly created workspaces
      } catch (err) {
        toast.error("Failed to parse and import questions", { id: "md-import" });
      }
    };
    reader.readAsText(file);
  };

  const handleManualImportMd = async () => {
    if (!mdText.trim()) {
      toast.error("Please paste markdown content first");
      return;
    }

    setMdLoading(true);
    toast.loading("Analyzing markdown and importing questions...", { id: "md-manual" });
    try {
      const res = await importMarkdownQuestionsAction(mdText);
      if (res.error) {
        toast.error(res.error, { id: "md-manual" });
        return;
      }
      toast.success(
        `Successfully imported ${res.questionsImported} questions! Created ${res.workspacesCreated} workspaces.`,
        { id: "md-manual" }
      );
      setIsImportModalOpen(false);
      setShowMdPaste(false);
      setMdText("");
      setMdFile(null);
      loadTechnologies(); // Reload technologies grid
    } catch (e) {
      toast.error("Failed to import questions", { id: "md-manual" });
    } finally {
      setMdLoading(false);
    }
  };

  const handleRecategorize = async () => {
    setRecategorizing(true);
    toast.loading("Analyzing General questions and recategorizing...", { id: "recategorize" });
    try {
      const res = await recategorizeGeneralQuestionsAction();
      if (res.error) {
        toast.error(res.error, { id: "recategorize" });
        return;
      }
      const msg = [
        `Moved ${res.movedCount} question${res.movedCount !== 1 ? "s" : ""} to their correct categories.`,
        res.workspacesCreated ? `Created ${res.workspacesCreated} new workspace${res.workspacesCreated !== 1 ? "s" : ""}.` : "",
        res.remainCount ? `${res.remainCount} question${res.remainCount !== 1 ? "s" : ""} kept in General (couldn't determine category).` : "",
        res.generalDeleted ? "General workspace was removed (now empty)." : "",
      ].filter(Boolean).join(" ");
      toast.success(msg, { id: "recategorize", duration: 6000 });
      loadTechnologies();
    } catch (err) {
      toast.error("Failed to recategorize questions", { id: "recategorize" });
    } finally {
      setRecategorizing(false);
    }
  };

  const hasGeneralWithQuestions = techList.some(
    (t) => t.slug === "general" && t.questions.length > 0
  );

  const filteredTechs = techList.filter((tech) =>
    tech.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Technologies</h1>
          <p className="text-muted-foreground mt-1">
            Your personalized interview preparation workspaces
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartImportQuestions}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground border border-border px-4 py-2.5 rounded-xl transition-all text-sm font-semibold cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Import Questions
          </button>
          <button
            onClick={handleStartCreateTech}
            className="flex items-center gap-2 gradient-bg text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 text-sm font-semibold cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Technology
          </button>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search technologies..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
        <button className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Technology Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspaces...</p>
        </div>
      ) : filteredTechs.length === 0 ? (
        <div className="text-center py-20 bg-card/20 border border-border/50 rounded-2xl p-8 max-w-md mx-auto">
          <Sparkles className="h-10 w-10 text-muted-foreground/45 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No workspaces yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upload your resume in Settings or add a technology manually above to create your first preparation workspace.
          </p>
          <button
            onClick={handleStartCreateTech}
            className="gradient-bg text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-95 transition-all cursor-pointer"
          >
            Create Workspace
          </button>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filteredTechs.map((tech) => {
            const questionsCount = tech.questions.length;
            const masteredCount = tech.questions.filter((q) => q.revisionStatus === "MASTERED").length;
            const progress = questionsCount > 0 ? Math.round((masteredCount / questionsCount) * 100) : 0;
            const icon = TECH_ICONS[tech.name.toLowerCase()] || "📦";

            return (
              <motion.div key={tech.id} variants={fadeInUp}>
                <Link href={`/technologies/${tech.slug}`} className="cursor-pointer">
                  <GlassCard hover className="relative overflow-hidden group">
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStartEditTech(tech);
                        }}
                        className="p-1.5 rounded-lg border border-border bg-black/15 hover:bg-primary/15 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                        title="Edit Workspace"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteTarget({ id: tech.id, name: tech.name });
                        }}
                        className="p-1.5 rounded-lg border border-border bg-black/15 hover:bg-red-500/15 hover:border-red-500/30 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                        title="Delete Workspace"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Tech Icon */}
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                      {icon}
                    </div>

                    {/* Name & Stats */}
                    <h3 className="text-lg font-semibold mb-1">{tech.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {masteredCount}/{questionsCount} questions mastered
                    </p>

                    {/* Progress Bar */}
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full gradient-bg transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        progress >= 70
                          ? "bg-green-500/10 text-green-500"
                          : progress >= 40
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-red-500/10 text-red-500"
                      )}>
                        {progress}% ready
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {questionsCount} Q
                      </span>
                    </div>

                    {/* Fix General button — only shows on General workspace */}
                    {tech.slug === "general" && questionsCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRecategorize();
                        }}
                        disabled={recategorizing}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 py-2 rounded-xl transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {recategorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Auto-sort into correct categories
                      </button>
                    )}

                    {/* Hover glow */}
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full gradient-bg opacity-0 group-hover:opacity-10 transition-opacity blur-xl" />
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add/Edit Technology Modal */}
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
              className="w-full max-w-md overflow-hidden rounded-2xl glass-strong border border-border p-6 shadow-2xl relative z-10"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                {editTarget ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editTarget ? "Edit Technology Workspace" : "Add New Technology"}
              </h2>
              <form onSubmit={handleSubmitTech} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Technology Name</label>
                  <input
                    type="text"
                    required
                    value={newTechName}
                    onChange={(e) => setNewTechName(e.target.value)}
                    placeholder="e.g., React, Go, Docker"
                    className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description (Optional)</label>
                  <textarea
                    value={newTechDesc}
                    onChange={(e) => setNewTechDesc(e.target.value)}
                    placeholder="Brief description of the workspace..."
                    className="w-full h-24 rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
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
                    {editTarget ? "Save Changes" : "Create Workspace"}
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
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete Workspace?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete the <span className="font-semibold text-foreground">"{deleteTarget.name}"</span> workspace and all of its questions? This action cannot be undone.
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

      {/* Smart Bulk Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={loadTechnologies}
      />
    </motion.div>
  );
}
