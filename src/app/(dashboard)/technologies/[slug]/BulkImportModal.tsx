"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FileText, GitBranch, FileArchive, Loader2, AlertTriangle, Check, 
  Trash2, Edit3, CheckCircle, Search, ArrowRight, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { getTechnologies } from "@/actions/technologies";
import { 
  parseBulkQuestionsAction, 
  getAllUserQuestionTitlesAction, 
  bulkImportQuestionsAction 
} from "@/actions/bulk-import";

// Levenshtein similarity check helper
function stringSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = (str2 || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  currentWorkspaceName?: string; // e.g. "React.js" if opened inside /technologies/react-js
  initialSource?: ImportSource;
}

type ImportSource = "markdown" | "paste" | "github" | "zip";

interface SelectedFile {
  path: string;
  sha?: string;
  file?: any; // JSZip file object
  selected: boolean;
}

interface TempParsedQuestion {
  tempId: string;
  title: string;
  answer: string;
  codeExample: string | null;
  codeLanguage: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  technology: string;
  duplicateId?: string;
  duplicateTitle?: string;
  duplicateWorkspace?: string;
  importStrategy: "insert" | "skip" | "replace" | "keep";
  similarity: number;
}

export function BulkImportModal({
  isOpen,
  onClose,
  onImportComplete,
  currentWorkspaceName,
  initialSource,
}: BulkImportModalProps) {
  // Wizard steps: 1 = choose source, 2 = select files (zip/github), 3 = preview/dedup, 4 = importing, 5 = done
  const [step, setStep] = useState<number>(1);
  const [source, setSource] = useState<ImportSource>("markdown");
  const [autoFormat, setAutoFormat] = useState(true);

  useEffect(() => {
    if (isOpen && initialSource) {
      setSource(initialSource);
    }
  }, [isOpen, initialSource]);
  
  // Sources data
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubSubpath, setGithubSubpath] = useState("");
  
  // Loader and File checklists
  const [loading, setLoading] = useState(false);
  const [fileChecklist, setFileChecklist] = useState<SelectedFile[]>([]);
  
  // Existing data caches
  const [existingTechs, setExistingTechs] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  
  // Parsed Questions state
  const [parsedQuestions, setParsedQuestions] = useState<TempParsedQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Import Progress & Done details
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);

  // File Inputs references
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch workspaces & questions for comparison
  useEffect(() => {
    if (isOpen) {
      handleReset();
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [techs, qTitles] = await Promise.all([
        getTechnologies(),
        getAllUserQuestionTitlesAction()
      ]);
      setExistingTechs(techs || []);
      if (qTitles.success && qTitles.questions) {
        setAllQuestions(qTitles.questions);
      }
    } catch (err) {
      console.error("Failed to load initial data for bulk import", err);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setPasteText("");
    setGithubUrl("");
    setGithubSubpath("");
    setFileChecklist([]);
    setParsedQuestions([]);
    setImportResult(null);
    setImportProgress(0);
    setIsImporting(false);
    
    // Reset file input DOM values so reselecting same file triggers onChange
    if (mdFileInputRef.current) mdFileInputRef.current.value = "";
    if (zipFileInputRef.current) zipFileInputRef.current.value = "";
  };

  // ── STEP 1: SOURCE SELECTION & UPLOAD HANDLERS ─────────────────

  const handleSourceSelect = (src: ImportSource) => {
    setSource(src);
    setFile(null);
    setFileChecklist([]);
  };

  const handleMdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    if (!uploaded.name.toLowerCase().endsWith(".md")) {
      toast.error("Please upload a Markdown (.md) file");
      return;
    }
    setFile(uploaded);
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    if (!uploaded.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please upload a ZIP (.zip) archive");
      return;
    }
    setFile(uploaded);
    
    // Parse ZIP contents to build checklist
    setLoading(true);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(uploaded);
      const mdFiles: SelectedFile[] = [];
      
      loadedZip.forEach((relativePath, entry) => {
        if (!entry.dir && relativePath.toLowerCase().endsWith(".md")) {
          mdFiles.push({
            path: relativePath,
            file: entry,
            selected: true,
          });
        }
      });

      if (mdFiles.length === 0) {
        toast.error("No Markdown (.md) files found inside the ZIP archive");
        setFile(null);
      } else {
        setFileChecklist(mdFiles);
        setStep(2); // Go to file selection
      }
    } catch (err) {
      toast.error("Failed to read ZIP archive. Make sure it is not corrupted.");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchGitHubRepo = async () => {
    if (!githubUrl) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    // Parse URL owner/repo
    let clean = githubUrl.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "");
    clean = clean.replace(/\/+$/, "");
    const parts = clean.split("/");
    if (parts.length < 2) {
      toast.error("Invalid URL format. Use e.g. https://github.com/owner/repo");
      return;
    }
    const owner = parts[0];
    const repo = parts[1];

    setLoading(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
      if (!response.ok) {
        throw new Error("Repository not found or API rate limit reached. Make sure it is a public repository.");
      }
      const data = await response.json();
      const tree = data.tree || [];
      
      let mdFiles = tree
        .filter((item: any) => item.type === "blob" && item.path.toLowerCase().endsWith(".md"))
        .map((item: any) => ({
          path: item.path,
          sha: item.sha,
          selected: true,
        }));

      // Filter by subpath if provided
      if (githubSubpath.trim()) {
        const sub = githubSubpath.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
        mdFiles = mdFiles.filter((f: SelectedFile) => 
          f.path.toLowerCase().startsWith(sub + "/")
        );
      }

      if (mdFiles.length === 0) {
        toast.error("No Markdown (.md) files found matching the search criteria");
      } else {
        setFileChecklist(mdFiles);
        setStep(2); // Go to checklist step
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch repository files.");
    } finally {
      setLoading(false);
    }
  };

  // ── PROCESS QUESTIONS (PARSING + DUPLICATE CHECKS) ────────────────

  const processQuestionsText = async (text: string) => {
    setLoading(true);
    try {
      const res = await parseBulkQuestionsAction(text, currentWorkspaceName, autoFormat);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      const questions = res.questions || [];
      if (questions.length === 0) {
        toast.error("Could not find any valid questions to import.");
        return;
      }

      // Check duplicates client side using loaded questions (Levenshtein similarity)
      const mapped = questions.map((q: any) => {
        let bestMatch: any = null;
        let maxSim = 0;
        
        for (const eq of allQuestions) {
          const sim = stringSimilarity(q.title, eq.title);
          if (sim > maxSim) {
            maxSim = sim;
            bestMatch = eq;
          }
        }
        
        const isDuplicate = maxSim >= 0.85;
        
        return {
          tempId: Math.random().toString(36).substring(2, 9),
          title: q.title,
          answer: q.answer || "",
          codeExample: q.codeExample || null,
          codeLanguage: q.codeLanguage || null,
          difficulty: (q.difficulty as any) || "MEDIUM",
          tags: q.tags || ["INTERMEDIATE"],
          technology: q.technology || currentWorkspaceName || "General",
          duplicateId: isDuplicate ? bestMatch.id : undefined,
          duplicateTitle: isDuplicate ? bestMatch.title : undefined,
          duplicateWorkspace: isDuplicate ? bestMatch.technology.name : undefined,
          importStrategy: (isDuplicate ? "skip" : "insert") as "insert" | "skip" | "replace" | "keep",
          similarity: maxSim,
        };
      });

      setParsedQuestions(mapped);
      setStep(3); // Go to Preview & Deduplicate
    } catch (err) {
      toast.error("Error processing import contents");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep1 = async () => {
    if (source === "markdown") {
      if (!file) {
        toast.error("Please upload a markdown file");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string || "";
        await processQuestionsText(text);
      };
      reader.readAsText(file);
    } else if (source === "paste") {
      if (!pasteText.trim()) {
        toast.error("Please paste markdown or plain text questions");
        return;
      }
      await processQuestionsText(pasteText);
    } else if (source === "zip") {
      if (!file) {
        toast.error("Please upload a ZIP file");
        return;
      }
      // Step 2 checklist already prepared on file change, just verify
      setStep(2);
    } else if (source === "github") {
      await fetchGitHubRepo();
    }
  };

  // ── STEP 2: CHECKLIST RESOLUTION FOR ZIP / GITHUB ───────────────

  const handleToggleFileCheck = (index: number) => {
    const copy = [...fileChecklist];
    copy[index].selected = !copy[index].selected;
    setFileChecklist(copy);
  };

  const handleSelectAllFiles = (selected: boolean) => {
    setFileChecklist(prev => prev.map(f => ({ ...f, selected })));
  };

  const handleProcessChecklist = async () => {
    const selected = fileChecklist.filter(f => f.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one file to parse");
      return;
    }

    setLoading(true);
    let combinedText = "";

    try {
      if (source === "zip") {
        for (const item of selected) {
          const content = await item.file.async("string");
          combinedText += `\n\n# File: ${item.path}\n\n${content}`;
        }
      } else if (source === "github") {
        // Fetch raw GitHub blobs
        let clean = githubUrl.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "");
        clean = clean.replace(/\/+$/, "");
        const parts = clean.split("/");
        const owner = parts[0];
        const repo = parts[1];

        for (const item of selected) {
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`);
          if (res.ok) {
            const data = await res.json();
            const decoded = new TextDecoder().decode(
              Uint8Array.from(atob(data.content.replace(/\s/g, "")), c => c.charCodeAt(0))
            );
            combinedText += `\n\n# File: ${item.path}\n\n${decoded}`;
          }
        }
      }

      await processQuestionsText(combinedText);
    } catch (err) {
      toast.error("Failed to read selected files from source");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: PREVIEW TABLE INLINE EDITS & ACTIONS ─────────────────

  const handleRemoveQuestion = (tempId: string) => {
    setParsedQuestions(prev => prev.filter(q => q.tempId !== tempId));
  };

  const handleUpdateField = (tempId: string, field: keyof TempParsedQuestion, value: any) => {
    setParsedQuestions(prev => prev.map(q => {
      if (q.tempId === tempId) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  // Bulk options
  const handleBulkChangeDifficulty = (difficulty: "EASY" | "MEDIUM" | "HARD") => {
    setParsedQuestions(prev => prev.map(q => ({ ...q, difficulty })));
    toast.success(`Set difficulty of all questions to ${difficulty}`);
  };

  const handleBulkChangeWorkspace = (technology: string) => {
    if (!technology.trim()) return;
    setParsedQuestions(prev => prev.map(q => ({ ...q, technology })));
    toast.success(`Assigned all questions to "${technology}" workspace`);
  };

  const handleBulkChangeStrategy = (strategy: "insert" | "skip" | "replace" | "keep") => {
    setParsedQuestions(prev => prev.map(q => {
      // Only apply to duplicates if it's skip/replace/keep
      if (q.duplicateId) {
        return { ...q, importStrategy: strategy };
      }
      return q;
    }));
    toast.success(`Bulk updated duplicate strategy to ${strategy.toUpperCase()}`);
  };

  // ── STEP 4: IMPORT SUBMISSION ──────────────────────────────────

  const executeBulkImport = async () => {
    if (parsedQuestions.length === 0) {
      toast.error("No questions left to import!");
      return;
    }

    setIsImporting(true);
    setStep(4);
    
    // Simulate progression for visual feedback
    const interval = setInterval(() => {
      setImportProgress(p => {
        if (p >= 85) {
          clearInterval(interval);
          return p;
        }
        return p + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    try {
      const importPayload = parsedQuestions.map(q => ({
        title: q.title,
        answer: q.answer,
        codeExample: q.codeExample,
        codeLanguage: q.codeLanguage,
        difficulty: q.difficulty,
        tags: q.tags,
        technology: q.technology,
        duplicateId: q.duplicateId,
        importStrategy: q.importStrategy,
      }));

      const res = await bulkImportQuestionsAction(importPayload);
      
      clearInterval(interval);
      setImportProgress(100);

      if (res.error) {
        toast.error(res.error);
        setStep(3); // return to preview if failed
      } else {
        setImportResult(res);
        setStep(5); // Go to done screen
        if (onImportComplete) {
          onImportComplete();
        }
      }
    } catch (err) {
      clearInterval(interval);
      toast.error("Bulk import failed due to an unexpected error.");
      setStep(3);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter parsed list by search
  const filteredParsed = parsedQuestions.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.technology.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFilesCount = fileChecklist.filter(f => f.selected).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className={cn(
              "w-full rounded-2xl glass-strong border border-border/80 shadow-2xl relative z-10 flex flex-col max-h-[90vh] bg-black/40",
              step === 3 ? "max-w-6xl" : "max-w-2xl"
            )}
          >
            {/* Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between bg-black/10 shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Smart Bulk Import Wizard
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Import dozens of interview questions instantly with duplicate checks
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Step indicators */}
            <div className="px-6 py-3 bg-muted/20 border-b border-border/40 flex gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap shrink-0">
              {[
                { s: 1, label: "1. Select Source" },
                ...(source === "zip" || source === "github" ? [{ s: 2, label: "2. Choose Files" }] : []),
                { s: 3, label: "3. Preview & Deduplicate" },
                { s: 4, label: "4. Importing" },
                { s: 5, label: "5. Summary" },
              ].map(indicator => (
                <div 
                  key={indicator.s} 
                  className={cn(
                    "flex items-center gap-1.5 transition-all",
                    step === indicator.s ? "text-primary" : step > indicator.s ? "text-green-500" : "text-muted-foreground/60"
                  )}
                >
                  {step > indicator.s && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span>{indicator.label}</span>
                  {indicator.s !== 5 && <span className="text-muted-foreground/30">/</span>}
                </div>
              ))}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* SKELETON LOADER FOR PARSING */}
              {loading && (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-semibold text-sm text-foreground">
                    {autoFormat ? "AI parsing & formatting answers..." : "AI parsing and indexing questions..."}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs text-center">
                    {autoFormat
                      ? "Converting document formats, structuring markdown answers, and running AI format enhancement."
                      : "Converting document formats, detecting topics, generating code examples, and checking duplicates."}
                  </p>
                </div>
              )}

              {/* STEP 1: CHOOSE SOURCE */}
              {!loading && step === 1 && (
                <div className="space-y-6">
                  {/* Mode Selector */}
                  <div className="grid grid-cols-4 gap-2 bg-black/20 p-1.5 rounded-xl border border-border">
                    {[
                      { id: "markdown", label: "Markdown", icon: FileText },
                      { id: "paste", label: "Bulk Paste", icon: Edit3 },
                      { id: "zip", label: "ZIP Archive", icon: FileArchive },
                      { id: "github", label: "GitHub Repo", icon: GitBranch },
                    ].map(src => {
                      const Icon = src.icon;
                      return (
                        <button
                          key={src.id}
                          onClick={() => handleSourceSelect(src.id as ImportSource)}
                          className={cn(
                            "flex flex-col items-center justify-center py-3 rounded-lg text-xs font-semibold transition-all gap-1.5 border border-transparent cursor-pointer",
                            source === src.id 
                              ? "bg-primary/10 text-primary border-primary/20" 
                              : "text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{src.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sources Content */}
                  <AnimatePresence mode="wait">
                    {source === "markdown" && (
                      <motion.div
                        key="markdown"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => mdFileInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={mdFileInputRef} 
                          onChange={handleMdFileChange} 
                          accept=".md" 
                          className="hidden" 
                        />
                        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-semibold mb-1">
                          {file ? file.name : "Select a Markdown (.md) File"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file ? `${(file.size / 1024).toFixed(1)} KB` : "Drag & drop your question sheet here or browse."}
                        </p>
                      </motion.div>
                    )}

                    {source === "paste" && (
                      <motion.div
                        key="paste"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-2"
                      >
                        <textarea
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          placeholder="Paste markdown content containing interview questions and answers. Use headings (e.g. ##, ###) for questions, and code blocks for example code."
                          className="w-full h-44 p-3 bg-black/20 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none font-mono placeholder:text-muted-foreground/40"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Chars: {pasteText.length}</span>
                          <span>Lines: {pasteText.split("\n").length}</span>
                        </div>
                      </motion.div>
                    )}

                    {source === "zip" && (
                      <motion.div
                        key="zip"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => zipFileInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={zipFileInputRef} 
                          onChange={handleZipFileChange} 
                          accept=".zip" 
                          className="hidden" 
                        />
                        <FileArchive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-semibold mb-1">
                          {file ? file.name : "Select a ZIP Archive (.zip)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Accepts ZIP archives containing markdown folders structure."}
                        </p>
                      </motion.div>
                    )}

                    {source === "github" && (
                      <motion.div
                        key="github"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Repository URL
                          </label>
                          <div className="relative">
                            <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                              type="text"
                              value={githubUrl}
                              onChange={(e) => setGithubUrl(e.target.value)}
                              placeholder="e.g. https://github.com/developer/prep-sheets"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-black/20 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Sub-path in Repo (Optional)
                          </label>
                          <input
                            type="text"
                            value={githubSubpath}
                            onChange={(e) => setGithubSubpath(e.target.value)}
                            placeholder="e.g. /javascript/concepts/ or leave empty for root"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-black/20 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all font-mono"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Auto Format Option */}
                  <div className="flex items-center gap-2.5 bg-black/25 p-4 rounded-xl border border-border/80 mt-4">
                    <input
                      type="checkbox"
                      id="autoFormatAnswers"
                      checked={autoFormat}
                      onChange={(e) => setAutoFormat(e.target.checked)}
                      className="rounded border-border focus:ring-primary h-4 w-4 accent-primary cursor-pointer"
                    />
                    <label 
                      htmlFor="autoFormatAnswers" 
                      className="text-xs font-semibold text-foreground/90 select-none cursor-pointer flex items-center gap-1.5"
                    >
                      ✨ Auto Format Answers Before Import
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 2: ZIP/GITHUB FILE CHECKLIST */}
              {!loading && step === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-border">
                    <div>
                      <h4 className="text-sm font-semibold">Select Markdown files</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Selected: <span className="font-bold text-primary">{selectedFilesCount}</span> / {fileChecklist.length}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectAllFiles(true)}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground/30">|</span>
                      <button
                        onClick={() => handleSelectAllFiles(false)}
                        className="text-xs font-semibold text-muted-foreground hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="border border-border rounded-xl max-h-[300px] overflow-y-auto divide-y divide-border/60 bg-black/10">
                    {fileChecklist.map((item, idx) => (
                      <div 
                        key={item.path} 
                        onClick={() => handleToggleFileCheck(idx)}
                        className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer text-xs font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => {}} // handled by click of parent row
                          className="rounded border-border focus:ring-primary h-3.5 w-3.5 accent-primary"
                        />
                        <FileText className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                        <span className="truncate text-foreground/80 font-mono">{item.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW & DEDUPLICATE TABLE */}
              {!loading && step === 3 && (
                <div className="space-y-6">
                  {/* Bulk updates & Filters */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-black/10 p-4 rounded-xl border border-border/80">
                    {/* Bulk controls */}
                    <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Bulk Edit:</span>
                      
                      {/* Bulk Workspace select */}
                      <select
                        onChange={(e) => {
                          handleBulkChangeWorkspace(e.target.value);
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="rounded-lg border border-border bg-black/20 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[150px]"
                      >
                        <option value="" disabled>Set Workspace</option>
                        {existingTechs.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>

                      {/* Bulk Difficulty select */}
                      <select
                        onChange={(e) => {
                          handleBulkChangeDifficulty(e.target.value as any);
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="rounded-lg border border-border bg-black/20 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="" disabled>Set Difficulty</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>

                      {/* Bulk Duplicate Strategy */}
                      <select
                        onChange={(e) => {
                          handleBulkChangeStrategy(e.target.value as any);
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="rounded-lg border border-border bg-black/20 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-amber-500 font-semibold"
                      >
                        <option value="" disabled>Duplicate Strategy</option>
                        <option value="skip">Skip All Duplicates</option>
                        <option value="replace">Replace All Duplicates</option>
                        <option value="keep">Keep Both (Import All)</option>
                      </select>
                    </div>

                    {/* Search filter */}
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search parsed questions..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-black/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* PREVIEW TABLE */}
                  <div className="border border-border/80 rounded-xl overflow-hidden bg-black/15">
                    <div className="overflow-x-auto max-h-[360px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-black/30 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider">
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3 min-w-[200px]">Question Title</th>
                            <th className="p-3 w-40">Workspace</th>
                            <th className="p-3 w-28">Difficulty</th>
                            <th className="p-3 min-w-[150px]">Duplicate Check</th>
                            <th className="p-3 w-16 text-center">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-medium">
                          {filteredParsed.map((q, idx) => {
                            const isDup = !!q.duplicateId;
                            return (
                              <tr 
                                key={q.tempId} 
                                className={cn(
                                  "hover:bg-muted/10 transition-colors",
                                  isDup && q.importStrategy === "skip" && "opacity-60 bg-amber-500/5",
                                  isDup && q.importStrategy === "replace" && "bg-red-500/5",
                                  isDup && q.importStrategy === "keep" && "bg-emerald-500/5"
                                )}
                              >
                                <td className="p-3 text-center text-muted-foreground font-semibold tabular-nums">
                                  {idx + 1}
                                </td>
                                
                                {/* Title cell (editable) */}
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={q.title}
                                    onChange={(e) => handleUpdateField(q.tempId, "title", e.target.value)}
                                    className="w-full bg-transparent focus:bg-black/40 focus:ring-1 focus:ring-primary border-none rounded px-2 py-1 focus:outline-none font-semibold text-foreground"
                                  />
                                </td>

                                {/* Workspace cell (dropdown) */}
                                <td className="p-3">
                                  <select
                                    value={q.technology}
                                    onChange={(e) => {
                                      if (e.target.value === "__new__") {
                                        const name = prompt("Enter new workspace name:");
                                        if (name && name.trim()) {
                                          setExistingTechs(prev => [...prev, { name: name.trim(), slug: name.trim().toLowerCase() }]);
                                          handleUpdateField(q.tempId, "technology", name.trim());
                                        }
                                      } else {
                                        handleUpdateField(q.tempId, "technology", e.target.value);
                                      }
                                    }}
                                    className="w-full bg-black/20 rounded border border-border/60 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-foreground"
                                  >
                                    {existingTechs.map(t => (
                                      <option key={t.id || t.name} value={t.name}>{t.name}</option>
                                    ))}
                                    <option value="__new__">+ New Workspace...</option>
                                  </select>
                                </td>

                                {/* Difficulty cell */}
                                <td className="p-3">
                                  <select
                                    value={q.difficulty}
                                    onChange={(e) => handleUpdateField(q.tempId, "difficulty", e.target.value as any)}
                                    className={cn(
                                      "w-full bg-black/20 rounded border border-border/60 px-2 py-1 text-xs focus:outline-none cursor-pointer font-bold",
                                      q.difficulty === "EASY" && "text-green-400",
                                      q.difficulty === "MEDIUM" && "text-yellow-400",
                                      q.difficulty === "HARD" && "text-red-400"
                                    )}
                                  >
                                    <option value="EASY">Easy</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HARD">Hard</option>
                                  </select>
                                </td>

                                {/* Duplicate Resolution Column */}
                                <td className="p-3">
                                  {isDup ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 w-fit">
                                        <AlertTriangle className="h-3 w-3 shrink-0" />
                                        <span>Levenshtein Match ({(q.similarity * 100).toFixed(0)}%)</span>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={q.duplicateTitle}>
                                        In: <strong className="text-foreground">{q.duplicateWorkspace}</strong>
                                      </div>
                                      
                                      {/* Strategy Select options */}
                                      <div className="flex gap-1 mt-1 bg-black/30 p-0.5 rounded border border-border/50 w-fit shrink-0">
                                        {[
                                          { id: "skip", label: "Skip", title: "Skip importing this question" },
                                          { id: "replace", label: "Replace", title: "Delete existing duplicate and write this one" },
                                          { id: "keep", label: "Keep", title: "Import anyway (keep both)" },
                                        ].map(opt => (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            title={opt.title}
                                            onClick={() => handleUpdateField(q.tempId, "importStrategy", opt.id)}
                                            className={cn(
                                              "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                                              q.importStrategy === opt.id 
                                                ? opt.id === "skip" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                  : opt.id === "replace" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                  : "bg-green-500/20 text-green-400 border border-green-500/30"
                                                : "text-muted-foreground/60 hover:text-foreground"
                                            )}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 flex items-center gap-1 w-fit">
                                      <Check className="h-3 w-3 shrink-0" />
                                      New Unique
                                    </span>
                                  )}
                                </td>

                                {/* Remove action */}
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleRemoveQuestion(q.tempId)}
                                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                    title="Remove from import"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: IMPORTING LOADER */}
              {step === 4 && (
                <div className="py-20 flex flex-col items-center justify-center gap-6 max-w-sm mx-auto">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="w-full text-center space-y-1">
                    <p className="font-semibold text-lg">Importing questions...</p>
                    <p className="text-xs text-muted-foreground">Uploading, deduplicating, and updating your revision schedule.</p>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden border border-border/80">
                    <div 
                      className="h-full rounded-full gradient-bg transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-primary">{importProgress}% completed</span>
                </div>
              )}

              {/* STEP 5: DONE / SUMMARY / ANALYTICS */}
              {step === 5 && importResult && (
                <div className="space-y-6 text-center py-6">
                  <div className="p-3 bg-emerald-500/15 rounded-full w-fit mx-auto border border-emerald-500/30 text-emerald-500">
                    <CheckCircle className="h-10 w-10 animate-bounce" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold">Import Completed Successfully!</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your workspaces have been updated with the new interview materials
                    </p>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-border text-center">
                      <span className="text-2xl font-bold text-primary block">{importResult.importedCount}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Imported</span>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-border text-center">
                      <span className="text-2xl font-bold text-amber-500 block">{importResult.skippedCount}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Skipped</span>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-border text-center">
                      <span className="text-2xl font-bold text-green-500 block">{importResult.workspacesCreatedCount}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Workspaces +</span>
                    </div>
                  </div>

                  {/* Workspace distribution breakdown */}
                  {Object.keys(importResult.importedByWorkspace).length > 0 && (
                    <div className="max-w-md mx-auto text-left space-y-2 bg-black/10 p-4 rounded-xl border border-border/80">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Workspace Breakdown</h4>
                      <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-1 text-xs">
                        {Object.entries(importResult.importedByWorkspace).map(([tech, count]) => {
                          const percentage = Math.max(5, Math.min(100, ((count as number) / importResult.importedCount) * 100));
                          return (
                            <div key={tech} className="space-y-1">
                              <div className="flex justify-between font-semibold">
                                <span className="text-foreground/95">{tech}</span>
                                <span className="text-primary tabular-nums">{count as number} questions</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-border/60 flex justify-between bg-black/10 shrink-0">
              {step > 1 && step < 4 ? (
                <button
                  onClick={() => {
                    if (step === 3 && (source === "markdown" || source === "paste")) {
                      setStep(1);
                    } else {
                      setStep(step - 1);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                {step === 1 ? (
                  <>
                    <button
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleNextStep1}
                      disabled={loading || (source === "markdown" && !file) || (source === "paste" && !pasteText.trim()) || (source === "zip" && !file) || (source === "github" && !githubUrl.trim())}
                      className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-lg shadow-primary/25"
                    >
                      <span>Analyze & Parse</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                ) : step === 2 ? (
                  <>
                    <button
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProcessChecklist}
                      disabled={loading}
                      className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-lg shadow-primary/25"
                    >
                      <span>Parse Selected ({selectedFilesCount})</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                ) : step === 3 ? (
                  <>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      onClick={executeBulkImport}
                      className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary/25"
                    >
                      <span>Import {parsedQuestions.filter(q => q.importStrategy !== "skip").length} Questions</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                ) : step === 5 ? (
                  <button
                    onClick={() => {
                      handleReset();
                      onClose();
                    }}
                    className="gradient-bg text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/25"
                  >
                    Done
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
