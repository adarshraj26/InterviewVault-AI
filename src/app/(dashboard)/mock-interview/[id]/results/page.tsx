import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/shared";
import { Trophy, ArrowLeft, CheckCircle2, AlertCircle, TrendingUp, Sparkles, MessageSquare } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MockInterviewResultsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const interview = await db.mockInterview.findUnique({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!interview || !interview.completedAt) {
    redirect("/mock-interview");
  }

  // Parse details from JSON strings
  const questionsWithFeedback = interview.questions.map((q) => {
    let evalObj = null;
    try {
      evalObj = q.feedback ? JSON.parse(q.feedback) : null;
    } catch (e) {
      // ignore
    }
    return {
      ...q,
      evaluation: evalObj,
    };
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-500 bg-green-500/10 border-green-500/20";
    if (score >= 70) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    return "text-red-500 bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/mock-interview" className="p-2.5 rounded-xl border border-border glass hover:bg-muted text-muted-foreground transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Interview Results</h1>
          <p className="text-muted-foreground mt-0.5">{interview.technology} · {interview.difficulty} difficulty</p>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="md:col-span-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 gradient-bg opacity-5 rounded-full blur-2xl" />
          <Trophy className="h-12 w-12 text-yellow-500 mb-4 animate-bounce" />
          <h2 className="text-muted-foreground text-sm font-medium">Overall Score</h2>
          <div className={`text-6xl font-extrabold my-2 ${getScoreColor(interview.score || 0).split(" ")[0]}`}>
            {interview.score?.toFixed(0)}%
          </div>
          <span className="text-xs text-muted-foreground">Based on {interview.totalQuestions} questions</span>
        </GlassCard>

        <GlassCard className="md:col-span-2 p-8 space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Breakdown
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Accuracy</span>
                <span>{interview.accuracy?.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${interview.accuracy}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Completeness</span>
                <span>{interview.completeness?.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${interview.completeness}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Communication</span>
                <span>{interview.communication?.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${interview.communication}%` }} />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* AI Overall Feedback */}
      {interview.feedback && (
        <GlassCard className="p-8 border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-24 w-24 text-primary" />
          </div>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-primary">
            <Sparkles className="h-5 w-5" />
            AI Coach Feedback
          </h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{interview.feedback}</p>

          {interview.areasOfImprovement && interview.areasOfImprovement.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-sm text-foreground mb-3">Key Areas of Improvement:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {interview.areasOfImprovement.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassCard>
      )}

      {/* Q&A Detailed Breakdown */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Question-by-Question Analysis
        </h3>

        {questionsWithFeedback.map((q, idx) => (
          <GlassCard key={q.id} className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="font-semibold text-base leading-relaxed">{q.question}</h4>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${getScoreColor(q.score || 0)}`}>
                Score: {q.score?.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Your Answer:</span>
                <p className="text-sm bg-black/20 p-4 rounded-xl border border-border/50 text-muted-foreground min-h-[80px] leading-relaxed">
                  {q.userAnswer}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-green-500 block">AI Expected Answer:</span>
                <p className="text-sm bg-green-500/5 p-4 rounded-xl border border-green-500/10 text-muted-foreground min-h-[80px] leading-relaxed">
                  {q.expectedAnswer}
                </p>
              </div>
            </div>

            {q.evaluation && (
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mt-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  AI Evaluation
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {q.evaluation.feedback}
                </p>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
