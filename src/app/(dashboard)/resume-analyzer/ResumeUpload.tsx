"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, FileText, Check } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { parseResumeAndSetupWorkspaces, extractTextFromPdfAction, analyzeResumeWithAI } from "@/actions/resume";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const fadeInUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

export default function ResumeUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [showTextPaste, setShowTextPaste] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const processAndAnalyze = async (fileName: string, fileSize: number, text: string) => {
    // 1. Parse resume file
    toast.loading("Parsing resume text...", { id: "parse-progress" });
    const parseRes = await parseResumeAndSetupWorkspaces("local-upload", fileName, fileSize, text);
    if (parseRes.error) {
      toast.error(parseRes.error, { id: "parse-progress" });
      setResumeLoading(false);
      return;
    }
    toast.success("Successfully extracted and parsed resume!", { id: "parse-progress" });
    
    // 2. Analyze with AI
    if (parseRes.resumeId) {
      setAnalysisLoading(true);
      toast.loading("Analyzing resume with AI...", { id: "ai-analysis" });
      const analysisRes = await analyzeResumeWithAI(parseRes.resumeId, text);
      setAnalysisLoading(false);
      if (analysisRes.error) {
        toast.warning(`Analysis: ${analysisRes.error}`, { id: "ai-analysis" });
      } else {
        toast.success(`ATS Score: ${analysisRes.atsScore}/100 — Analysis Complete`, { id: "ai-analysis" });
        router.refresh();
      }
    }
    setResumeLoading(false);
    setShowTextPaste(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    const fileNameLower = file.name.toLowerCase();

    if (file.type === "text/plain" || fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string || "";
        setResumeText(text);
        setResumeLoading(true);
        await processAndAnalyze(file.name, file.size, text);
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf" || fileNameLower.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        setResumeLoading(true);
        toast.loading("Extracting text from PDF resume...", { id: "pdf-extract" });
        try {
          const res = await extractTextFromPdfAction(base64);
          if (res.error) {
            toast.error(res.error, { id: "pdf-extract" });
            setShowTextPaste(true);
            setResumeLoading(false);
            return;
          }
          toast.success("Successfully extracted PDF text!", { id: "pdf-extract" });
          setResumeText(res.text || "");
          await processAndAnalyze(file.name, file.size, res.text || "");
        } catch (err) {
          toast.error("Failed to process PDF file", { id: "pdf-extract" });
          setShowTextPaste(true);
          setResumeLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setShowTextPaste(true);
      toast.info("Please paste the plain text of your resume in the textarea below to parse with Gemini.");
    }
  };

  const handleManualParse = async () => {
    const fileName = resumeFile ? resumeFile.name : "resume.txt";
    const fileSize = resumeFile ? resumeFile.size : 1024;

    if (!resumeText.trim()) {
      toast.error("Please paste or load your resume text before parsing");
      return;
    }
    setResumeLoading(true);
    await processAndAnalyze(fileName, fileSize, resumeText);
  };

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="w-full">
      <GlassCard>
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload Resume
        </h2>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.docx,.txt,.md" 
          className="hidden" 
        />

        <div 
          onClick={handleBrowseClick}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Drag and drop your resume here</p>
          <p className="text-xs text-muted-foreground mb-4">Supports PDF, DOCX, TXT (max 10MB)</p>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            disabled={resumeLoading || analysisLoading}
            className="gradient-bg text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            Browse Files
          </button>
        </div>

        {showTextPaste && (
          <div className="mt-6 space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-primary block">
                {resumeFile ? `Resume Text (${resumeFile.name})` : "Paste Resume Text"}
              </label>
              <button 
                onClick={() => setShowTextPaste(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste the plain text content of your resume here to extract skills with Gemini AI..."
              className="w-full h-48 p-3 bg-black/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none font-mono"
            />
            
            <button
              onClick={handleManualParse}
              disabled={resumeLoading || analysisLoading}
              className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {(resumeLoading || analysisLoading) ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Parse & Analyze Resume
                </>
              )}
            </button>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
