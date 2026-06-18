"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mic, Play, ChevronRight, Trophy, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { startMockInterview } from "@/actions/mockInterviews";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

interface Tech {
  id: string;
  name: string;
}

interface Interview {
  id: string;
  technology: string;
  difficulty: string;
  score: number | null;
  totalQuestions: number;
  createdAt: Date;
  completedAt: Date | null;
}

export default function MockInterviewDashboard({ 
  technologies, 
  pastInterviews 
}: { 
  technologies: Tech[]; 
  pastInterviews: any[]; 
}) {
  const router = useRouter();
  const [selectedTech, setSelectedTech] = useState(technologies[0]?.name || "JavaScript");
  const [selectedDifficulty, setSelectedDifficulty] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await startMockInterview(selectedTech, selectedDifficulty as any);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Mock interview session ready!");
      router.push(`/mock-interview/${res.interviewId}`);
    } catch (err) {
      toast.error("Failed to start mock interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8 max-w-5xl mx-auto">
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold">Mock Interview</h1>
        <p className="text-muted-foreground mt-1">Practice with AI-powered interviews and get instant feedback</p>
      </motion.div>

      {/* Setup Card */}
      <motion.div variants={fadeInUp}>
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 gradient-bg opacity-5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Start New Interview</h2>
                <p className="text-sm text-muted-foreground">Configure your mock interview session</p>
              </div>
            </div>

            {/* Technology Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Select Technology</label>
              {technologies.length === 0 ? (
                <p className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                  Please upload your resume in Settings or add technologies first to customize your workspaces.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech) => (
                    <button
                      key={tech.id}
                      onClick={() => setSelectedTech(tech.name)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all",
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
                      "flex-1 py-3 rounded-xl text-sm font-medium transition-all border",
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
              className="w-full gradient-bg text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              {loading ? "Initializing Interview..." : "Start Mock Interview"}
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Past Interviews */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-semibold mb-4">Past Interviews</h2>
        {pastInterviews.length === 0 ? (
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
        )}
      </motion.div>
    </motion.div>
  );
}
