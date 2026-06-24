"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Award, Flame, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "./glass-card";
import { cn } from "@/lib/utils";

interface TriviaQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    category: "JavaScript",
    question: "What does `console.log(typeof null)` output in JavaScript?",
    options: ["'null'", "'object'", "'undefined'", "'value'"],
    correctAnswer: 1,
    explanation: "This is a well-known legacy bug in JavaScript. `null` is a primitive value representing the intentional absence of any object, but `typeof` returns `'object'` because of how values were represented in the original JS engine type tag systems.",
  },
  {
    id: 2,
    category: "React",
    question: "Which Hook executes synchronously AFTER all DOM mutations but BEFORE the browser paints?",
    options: ["useEffect", "useMemo", "useLayoutEffect", "useInsertionEffect"],
    correctAnswer: 2,
    explanation: "`useLayoutEffect` runs synchronously after all DOM mutations but before the browser paints the screen. Use this to read layout from the DOM and synchronously re-render to avoid visual flickers.",
  },
  {
    id: 3,
    category: "CSS",
    question: "In CSS Flexbox, what is the default value of the `flex-grow` property?",
    options: ["0", "1", "auto", "none"],
    correctAnswer: 0,
    explanation: "The default value of `flex-grow` is `0`. This means flex items will not grow to occupy the remaining space in the container unless explicitly set to a value greater than 0.",
  },
  {
    id: 4,
    category: "Next.js",
    question: "Which Rendering Method generates static HTML at BUILD time?",
    options: ["SSR (Server-Side Rendering)", "SSG (Static Site Generation)", "ISR (Incremental Static Regeneration)", "CSR (Client-Side Rendering)"],
    correctAnswer: 1,
    explanation: "Static Site Generation (SSG) compiles and generates HTML files at build time. The static HTML is then served quickly via a CDN, offering optimal performance and SEO.",
  },
  {
    id: 5,
    category: "JavaScript",
    question: "What is the default value of a variable declared with `let` but not initialized?",
    options: ["null", "undefined", "NaN", "ReferenceError"],
    correctAnswer: 1,
    explanation: "In JavaScript, any variable declared with `let` or `var` that is not explicitly initialized with a value is automatically assigned the default value of `undefined`.",
  },
];

export function DailyChallenge() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Select question of the day based on the calendar date index
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const questionIndex = dayOfYear % TRIVIA_QUESTIONS.length;
    const selectedQuestion = TRIVIA_QUESTIONS[questionIndex];
    setQuestion(selectedQuestion);

    // Load answered state
    const storageKey = `iv-challenge-ans-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const savedAnswer = localStorage.getItem(storageKey);
    if (savedAnswer !== null) {
      setSelectedIdx(parseInt(savedAnswer, 10));
      setHasAnswered(true);
    }

    // Load streak
    const savedStreak = localStorage.getItem("iv-challenge-streak");
    if (savedStreak) {
      setStreak(parseInt(savedStreak, 10));
    }
  }, []);

  const handleSelectOption = (idx: number) => {
    if (hasAnswered || !question) return;

    setSelectedIdx(idx);
    setHasAnswered(true);

    const today = new Date();
    const storageKey = `iv-challenge-ans-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    localStorage.setItem(storageKey, idx.toString());

    // Update streak if correct
    if (idx === question.correctAnswer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("iv-challenge-streak", newStreak.toString());
    } else {
      setStreak(0);
      localStorage.setItem("iv-challenge-streak", "0");
    }
  };

  if (!question) return null;

  const isCorrect = selectedIdx === question.correctAnswer;

  return (
    <>
      {/* ── Peaking Tab Trigger on Right Edge ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center py-4 px-2 bg-card/90 backdrop-blur-xl border border-r-0 border-border/80 shadow-2xl rounded-l-2xl hover:bg-muted/80 text-foreground transition-all cursor-pointer group active:scale-95"
            title="Daily Challenge"
          >
            <ChevronLeft className="h-4.5 w-4.5 text-primary group-hover:-translate-x-0.5 transition-transform duration-200" />
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span
                className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 group-hover:text-foreground transition-colors"
                style={{ writingMode: "vertical-lr" }}
              >
                Daily Quiz
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Sliding Quiz Drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur/Dim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm"
            />

            {/* Slider Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-background/95 border-l border-border shadow-2xl z-50 p-6 flex flex-col overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-extrabold text-base tracking-tight">Daily Challenge</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Flame className="h-3.5 w-3.5 fill-current" />
                    <span>{streak} Streak</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    title="Close Panel"
                  >
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Category Indicator */}
              <div className="mb-3">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  {question.category}
                </span>
              </div>

              {/* Question */}
              <h4 className="text-base font-semibold text-foreground/90 leading-relaxed mb-5">
                {question.question}
              </h4>

              {/* Options */}
              <div className="space-y-2 flex-grow">
                {question.options.map((option, idx) => {
                  const isSelected = selectedIdx === idx;
                  const isCorrectOption = question.correctAnswer === idx;

                  let btnStyles = "border-border/60 hover:border-foreground/30 hover:bg-muted/30";
                  let badge = null;

                  if (hasAnswered) {
                    if (isCorrectOption) {
                      btnStyles = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium";
                      badge = <Check className="h-4 w-4 text-emerald-400 shrink-0" />;
                    } else if (isSelected) {
                      btnStyles = "border-red-500/30 bg-red-500/10 text-red-400 font-medium";
                      badge = <X className="h-4 w-4 text-red-400 shrink-0" />;
                    } else {
                      btnStyles = "border-border/40 opacity-50 cursor-not-allowed";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={hasAnswered}
                      onClick={() => handleSelectOption(idx)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 focus:outline-none",
                        !hasAnswered && "cursor-pointer active:scale-[0.99]",
                        btnStyles
                      )}
                    >
                      <span className="leading-snug">{option}</span>
                      {badge}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Reveal */}
              <AnimatePresence>
                {hasAnswered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-xl bg-card border border-border/40 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 mb-2 font-bold">
                        <Award className={cn("h-4.5 w-4.5", isCorrect ? "text-emerald-400" : "text-amber-500")} />
                        <span className={isCorrect ? "text-emerald-400" : "text-amber-500"}>
                          {isCorrect ? "Correct!" : "Nice Try!"}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-xs">
                        {question.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
