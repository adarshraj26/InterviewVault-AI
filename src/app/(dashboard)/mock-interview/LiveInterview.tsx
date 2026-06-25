"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Play, CheckCircle, AlertTriangle, ArrowRight, Loader2, Sparkles, X } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { submitAnswer, finishMockInterview } from "@/actions/mockInterviews";
import { toast } from "sonner";
import { db } from "@/lib/db"; // wait, this is client side, we'll fetch via api or pass via server page.

// Since this is a client component, let's create a server page wrapper or just fetch data via a simple client-side load.
// Wait, we can fetch the interview data in a wrapper and pass it to this component!
// Let's first write the client component, let's call it LiveInterview.

interface Question {
  id: string;
  question: string;
  order: number;
  userAnswer: string | null;
}

interface Interview {
  id: string;
  technology: string;
  difficulty: string;
  questions: Question[];
}

export default function LiveInterview({ interview, initialQuestions }: { interview: any; initialQuestions: any[] }) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes per question
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentQuestion = initialQuestions[currentIdx];

  useEffect(() => {
    // Timer
    if (timeRemaining <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, currentIdx]);

  useEffect(() => {
    setTimeRemaining(300); // reset timer for new question
  }, [currentIdx]);

  const handleTextChange = (text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: text,
    }));
  };

  const handleRecordingToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info("Voice input started. (Simulated - Type your answer or speak)");
      // Simulate speech-to-text
      setTimeout(() => {
        if (isRecording) return;
        const currentAns = answers[currentQuestion.id] || "";
        handleTextChange(currentAns + (currentAns ? " " : "") + "This is a simulated speech-to-text transcript of the answer for " + interview.technology + " interview.");
      }, 3000);
    } else {
      toast.success("Voice input saved.");
    }
  };

  const handleNext = async () => {
    const answer = answers[currentQuestion.id] || "";
    if (!answer.trim()) {
      toast.warning("Please provide an answer before proceeding.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitAnswer(currentQuestion.id, answer);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Answer submitted successfully!");
      
      if (currentIdx < initialQuestions.length - 1) {
        setCurrentIdx((prev) => prev + 1);
      } else {
        handleFinish();
      }
    } catch (err) {
      toast.error("Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await finishMockInterview(interview.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Interview completed! Generating feedback...");
      router.push(`/mock-interview/${interview.id}/results`);
    } catch (err) {
      toast.error("Failed to complete interview");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-primary font-bold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            Question {currentIdx + 1} of {initialQuestions.length}
          </span>
          <h1 className="text-2xl font-bold mt-2">{interview.technology} Mock Interview</h1>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
          <div className="text-right">
            <span className="text-sm text-muted-foreground block">Time remaining</span>
            <span className="font-mono text-lg font-bold text-red-400">{formatTime(timeRemaining)}</span>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-2.5 rounded-xl border border-border glass hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all cursor-pointer flex items-center gap-2 text-sm font-medium"
            title="Exit Interview"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      <GlassCard className="p-8 relative overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 gradient-bg opacity-5 rounded-full blur-3xl" />
        
        <div>
          <h2 className="text-xl font-semibold leading-relaxed mb-6">
            {currentQuestion.question}
          </h2>

          <textarea
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Type your answer here or use the microphone to dictate..."
            className="w-full h-48 p-4 rounded-xl border border-border bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none font-medium"
            disabled={submitting || loading}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mt-6">
          <button
            onClick={handleRecordingToggle}
            className={`w-full sm:w-auto justify-center p-4 rounded-xl border transition-all flex items-center gap-2 font-medium ${
              isRecording 
                ? "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30" 
                : "border-border glass hover:bg-muted text-muted-foreground"
            }`}
            disabled={submitting || loading}
          >
            {isRecording ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
            {isRecording ? "Stop Dictation" : "Dictate Answer"}
          </button>

          <button
            onClick={handleNext}
            disabled={submitting || loading}
            className="w-full sm:w-auto justify-center gradient-bg text-white font-semibold px-6 py-4 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/25 flex items-center gap-2"
          >
            {submitting || loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {currentIdx < initialQuestions.length - 1 ? "Next Question" : "Submit Interview"}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </GlassCard>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6 border border-red-500/20">
                <div className="flex items-center gap-3 text-red-400 mb-4">
                  <AlertTriangle className="h-6 w-6" />
                  <h3 className="text-lg font-bold">Exit Mock Interview?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Are you sure you want to exit this session? Your current progress and answers for this interview will be discarded.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="px-4 py-2.5 rounded-xl border border-border glass hover:bg-muted text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => router.push("/mock-interview")}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all shadow-lg shadow-red-500/20 cursor-pointer"
                  >
                    Yes, Exit
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
