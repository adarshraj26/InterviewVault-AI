"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mic, Play, ChevronRight, Loader2, Layers, Cpu } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { startMockInterview } from "@/actions/mockInterviews";
import { startSystemDesignInterview } from "@/actions/systemDesign";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

interface Tech {
  id: string;
  name: string;
  isGlobal?: boolean;
}

export default function MockInterviewDashboard({ 
  technologies, 
  pastInterviews,
  pastSystemDesignInterviews = []
}: { 
  technologies: Tech[]; 
  pastInterviews: any[]; 
  pastSystemDesignInterviews?: any[];
}) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"coding" | "system-design">("coding");
  const [selectedTech, setSelectedTech] = useState(technologies[0]?.name || "JavaScript");
  const [selectedDifficulty, setSelectedDifficulty] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      if (activeMode === "system-design") {
        const res = await startSystemDesignInterview(selectedTech, selectedDifficulty as any);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("System design interview session ready!");
        router.push(`/system-design-interview/${res.interviewId}`);
      } else {
        const res = await startMockInterview(selectedTech, selectedDifficulty as any);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Mock interview session ready!");
        router.push(`/mock-interview/${res.interviewId}`);
      }
    } catch (err) {
      toast.error("Failed to start interview session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8 max-w-5xl mx-auto">
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mock Interview</h1>
          <p className="text-muted-foreground mt-1">Practice with AI-powered interviews and get instant feedback</p>
        </div>

        {/* Premium Mode Selector Tabs */}
        <div className="flex bg-muted/40 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 shrink-0">
          <button
            onClick={() => setActiveMode("coding")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeMode === "coding"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mic className="h-3.5 w-3.5" />
            Coding & Q&A
          </button>
          <button
            onClick={() => setActiveMode("system-design")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeMode === "system-design"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            System Design
          </button>
        </div>
      </motion.div>

      {/* Setup Card */}
      <motion.div variants={fadeInUp}>
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 gradient-bg opacity-5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg">
                {activeMode === "system-design" ? (
                  <Layers className="h-6 w-6 text-white" />
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {activeMode === "system-design" ? "Start System Design Prep" : "Start New Q&A Interview"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeMode === "system-design" 
                    ? "Interactive Excalidraw design board + AI architecture audit"
                    : "Configure your mock interview session"
                  }
                </p>
              </div>
            </div>

            {/* Technology Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Select Technology</label>
              {technologies.length === 0 ? (
                <div className="text-sm bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 space-y-2">
                  <p className="text-yellow-500 font-semibold">No technologies available yet.</p>
                  <p className="text-muted-foreground">
                    To unlock the mock interview, do any of the following:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                    <li>Upload your resume in <strong>Settings</strong> to auto-extract technologies</li>
                    <li>Manually add a technology in the <strong>Tech-Stacks</strong> section</li>
                    <li>Ask your admin to mark a technology as <strong>Global</strong></li>
                  </ul>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech) => (
                    <button
                      key={tech.id}
                      onClick={() => setSelectedTech(tech.name)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                        selectedTech === tech.name
                          ? "gradient-bg text-white shadow-lg shadow-primary/25"
                          : "glass hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {tech.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium mb-3">Select Difficulty</label>
              <div className="flex gap-3">
                {["EASY", "MEDIUM", "HARD"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-medium transition-all border cursor-pointer",
                      selectedDifficulty === d
                        ? d === "EASY"
                          ? "bg-green-500/10 border-green-500 text-green-500"
                          : d === "MEDIUM"
                            ? "bg-yellow-500/10 border-yellow-500 text-yellow-500"
                            : "bg-red-500/10 border-red-500 text-red-500"
                        : "border-border glass hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={loading || technologies.length === 0}
              className="w-full gradient-bg text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              {loading 
                ? "Initializing Interview..." 
                : activeMode === "system-design" 
                  ? "Start System Design Interview" 
                  : "Start Mock Interview"
              }
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Past Interviews */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-semibold mb-4">
          {activeMode === "system-design" ? "Past System Designs" : "Past Q&A Interviews"}
        </h2>

        {activeMode === "system-design" ? (
          pastSystemDesignInterviews.length === 0 ? (
            <GlassCard className="p-8 text-center text-muted-foreground">
              No system design prep sessions started yet. Configure one above to build your architecture diagrams!
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {pastSystemDesignInterviews.map((design) => (
                <Link key={design.id} href={design.completedAt ? `/system-design-interview/${design.id}/results` : `/system-design-interview/${design.id}`}>
                  <GlassCard hover className="flex items-center justify-between py-4 mb-3">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border",
                        design.score === null 
                          ? "bg-muted text-muted-foreground border-border" 
                          : design.score >= 85 
                            ? "bg-green-500/10 text-green-500 border-green-500/20" 
                            : design.score >= 70 
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" 
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {design.score !== null ? `${design.score.toFixed(0)}` : "—"}
                      </div>
                      <div>
                        <h3 className="font-medium">{design.technology} Design</h3>
                        <p className="text-xs text-muted-foreground/80 line-clamp-1 max-w-[500px] mt-0.5">{design.question}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="capitalize">{design.difficulty.toLowerCase()}</span>
                          <span>·</span>
                          <span>
                            {design.completedAt 
                              ? formatDistanceToNow(new Date(design.completedAt), { addSuffix: true })
                              : "Draft — Continue Editing"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </GlassCard>
                </Link>
              ))}
            </div>
          )
        ) : (
          pastInterviews.length === 0 ? (
            <GlassCard className="p-8 text-center text-muted-foreground">
              No mock interviews completed yet. Start one above to test your skills!
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {pastInterviews.map((interview) => (
                <Link key={interview.id} href={`/mock-interview/${interview.id}/results`}>
                  <GlassCard hover className="flex items-center justify-between py-4 mb-3">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border",
                        interview.score === null 
                          ? "bg-muted text-muted-foreground border-border" 
                          : interview.score >= 85 
                            ? "bg-green-500/10 text-green-500 border-green-500/20" 
                            : interview.score >= 70 
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" 
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {interview.score !== null ? `${interview.score.toFixed(0)}` : "—"}
                      </div>
                      <div>
                        <h3 className="font-medium">{interview.technology}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{interview.difficulty}</span>
                          <span>·</span>
                          <span>{interview.totalQuestions} questions</span>
                          <span>·</span>
                          <span>
                            {interview.completedAt 
                              ? formatDistanceToNow(new Date(interview.completedAt), { addSuffix: true })
                              : "In Progress"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </GlassCard>
                </Link>
              ))}
            </div>
          )
        )}
      </motion.div>
    </motion.div>
  );
}
