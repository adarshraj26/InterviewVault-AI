"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, AlertTriangle, ArrowRight, Loader2, X } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { submitAnswer, finishMockInterview } from "@/actions/mockInterviews";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  order: number;
  userAnswer: string | null;
}

export default function LiveInterview({ interview, initialQuestions }: { interview: any; initialQuestions: any[] }) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const recognitionRef = useRef<any>(null);

  const currentQuestion = initialQuestions[currentIdx];

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => setTimeRemaining((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, currentIdx]);

  useEffect(() => {
    setTimeRemaining(300);
  }, [currentIdx]);

  // ── Stop recognition when question changes or component unmounts ───────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, [currentIdx]);

  const handleTextChange = (text: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: text }));
  };

  // ── Real Web Speech API dictation ──────────────────────────────────────────
  const handleRecordingToggle = () => {
    // Check browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice dictation is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // Start recording
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info("Listening… speak your answer clearly.");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(" ");

      setAnswers((prev) => {
        const existing = prev[currentQuestion.id] || "";
        const separator = existing.trim() ? " " : "";
        return { ...prev, [currentQuestion.id]: existing + separator + transcript };
      });
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        toast.error("Microphone access denied. Please allow microphone permissions and try again.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── Submit / navigation ────────────────────────────────────────────────────
  const handleNext = async () => {
    const answer = answers[currentQuestion.id] || "";
    if (!answer.trim()) {
      toast.warning("Please provide an answer before proceeding.");
      return;
    }

    // Stop any active recording before submitting
    recognitionRef.current?.stop();
    setIsRecording(false);

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
    } catch {
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
    } catch {
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
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold leading-relaxed mb-6">
                {currentQuestion.question}
              </h2>
            </motion.div>
          </AnimatePresence>

          <textarea
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Type your answer here or click Dictate Answer to speak..."
            className="w-full h-48 p-4 rounded-xl border border-border bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none font-medium"
            disabled={submitting || loading}
          />
        </div>

        {/* Live Audio Equalizer Waveform Animation when recording */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Listening... Speak clearly into your microphone
              </div>
              <div className="flex items-center gap-1 h-5">
                {[0.4, 0.8, 1.2, 0.6, 1.0, 1.4, 0.7, 0.3].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-red-500 rounded-full"
                    animate={{ height: ["20%", "100%", "30%"] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      repeatType: "reverse",
                      delay: delay * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleRecordingToggle}
            className={cn(
              "w-full sm:w-auto justify-center p-4 rounded-xl border transition-all flex items-center gap-2 font-medium cursor-pointer relative overflow-hidden",
              isRecording
                ? "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                : "border-border glass hover:bg-muted text-muted-foreground"
            )}
            disabled={submitting || loading}
          >
            {isRecording ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
            {isRecording ? "Stop Dictation" : "Dictate Answer"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            disabled={submitting || loading}
            className="w-full sm:w-auto justify-center gradient-bg text-white font-semibold px-6 py-4 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/25 flex items-center gap-2 cursor-pointer"
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
          </motion.button>
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
