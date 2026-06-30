import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ResumeAnalyzerClient from "./ResumeAnalyzerClient";
import ResumeUpload from "./ResumeUpload";

export const metadata = {
  title: "Resume Analyzer | InterviewVault AI",
  description: "AI-powered resume analysis with ATS score, grammar feedback, keyword suggestions, and recruiter insights.",
};

export default async function ResumeAnalyzerPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch the latest resume with all analyses
  const latestResume = await db.resume.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, fileSize: true, createdAt: true },
  });

  // Fetch the latest analysis
  const latestAnalysis = latestResume
    ? await db.resumeAnalysis.findFirst({
        where: { userId, resumeId: latestResume.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  // Fetch all analyses for version history
  const allAnalyses = await db.resumeAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      resume: { select: { fileName: true } },
    },
  });

  if (!latestResume || !latestAnalysis) {
    return (
      <div className="container py-12 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4 mb-8">
          <div className="text-5xl">📄</div>
          <h1 className="text-2xl font-bold">No Resume Analyzed Yet</h1>
          <p className="text-muted-foreground">
            Upload your resume below to get an AI-powered ATS score, detailed feedback, grammar
            analysis, and recruiter insights.
          </p>
        </div>
        <ResumeUpload />
      </div>
    );
  }

  // Serialize dates for client component
  const serializedAnalysis = {
    ...latestAnalysis,
    createdAt: latestAnalysis.createdAt.toISOString(),
    sectionScores: latestAnalysis.sectionScores as any,
    missingKeywords: latestAnalysis.missingKeywords as any,
    grammarIssues: latestAnalysis.grammarIssues as any,
    actionVerbs: latestAnalysis.actionVerbs as any,
    bulletPoints: latestAnalysis.bulletPoints as any,
    projectAnalysis: latestAnalysis.projectAnalysis as any,
    recruiterFeedback: latestAnalysis.recruiterFeedback as any,
    formattingTips: latestAnalysis.formattingTips as any,
    skillCategories: latestAnalysis.skillCategories as any,
  };

  const serializedHistory = allAnalyses.map((a) => ({
    id: a.id,
    resumeId: a.resumeId,
    atsScore: a.atsScore,
    createdAt: a.createdAt.toISOString(),
    fileName: a.resume?.fileName ?? "resume",
    sectionScores: a.sectionScores as any,
  }));

  return (
    <ResumeAnalyzerClient
      analysis={serializedAnalysis}
      history={serializedHistory}
      resumeFileName={latestResume.fileName}
      resumeId={latestResume.id}
    />
  );
}
