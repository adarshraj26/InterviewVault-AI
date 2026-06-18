import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch user profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const userName = user?.name || session.user.name || "User";

  // 2. Fetch technologies and questions
  const technologies = await db.technology.findMany({
    where: { userId },
    include: {
      questions: {
        select: {
          id: true,
          title: true,
          revisionStatus: true,
          createdAt: true,
          revisionRecords: {
            orderBy: { revisedAt: "desc" },
            take: 1,
            select: {
              nextReviewAt: true,
              revisedAt: true,
            },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  let totalQuestionsCount = 0;
  let dueCount = 0;
  let overdueCount = 0;
  let totalReadinessScoreSum = 0;

  const statusWeights = {
    NOT_STARTED: 0,
    LEARNING: 40,
    REVISED_ONCE: 75,
    MASTERED: 100,
  };

  const techProgress = technologies.map((tech) => {
    const total = tech.questions.length;
    const mastered = tech.questions.filter(q => q.revisionStatus === "MASTERED").length;

    totalQuestionsCount += total;

    tech.questions.forEach((q) => {
      // readiness score
      const weight = statusWeights[q.revisionStatus] || 0;
      totalReadinessScoreSum += weight;

      // due check
      const lastRec = q.revisionRecords[0];
      const isDue = !lastRec?.nextReviewAt || new Date(lastRec.nextReviewAt) <= now;
      if (isDue) {
        dueCount++;
      }
      if (lastRec?.nextReviewAt && new Date(lastRec.nextReviewAt) < now) {
        overdueCount++;
      }
    });

    return {
      name: tech.name,
      mastered,
      total,
      icon: tech.icon || "💻",
    };
  });

  const readinessScore = totalQuestionsCount > 0
    ? Math.round(totalReadinessScoreSum / totalQuestionsCount)
    : 0;

  // 3. Stats Change Counts
  const technologiesCreatedThisWeek = await db.technology.count({
    where: {
      userId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  const questionsCreatedThisWeek = await db.question.count({
    where: {
      userId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  const totalRevisions = await db.revisionRecord.count({
    where: { userId },
  });

  const revisionsToday = await db.revisionRecord.count({
    where: {
      userId,
      revisedAt: { gte: startOfToday },
    },
  });

  const revisionsThisWeek = await db.revisionRecord.count({
    where: {
      userId,
      revisedAt: { gte: sevenDaysAgo },
    },
  });

  const readinessChange = totalQuestionsCount > 0
    ? Math.round((revisionsThisWeek * 25) / totalQuestionsCount)
    : 0;

  // 4. Mock Interviews Stats
  const mockInterviews = await db.mockInterview.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    select: { score: true },
  });

  const totalInterviews = mockInterviews.length;
  const avgScore = totalInterviews > 0
    ? Math.round(mockInterviews.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalInterviews)
    : 0;

  // 5. Recent activities
  const latestQuestions = await db.question.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      technology: {
        select: { name: true },
      },
    },
  });

  const latestRevisions = await db.revisionRecord.findMany({
    where: { userId },
    orderBy: { revisedAt: "desc" },
    take: 5,
    include: {
      question: {
        include: {
          technology: {
            select: { name: true },
          },
        },
      },
    },
  });

  const latestInterviews = await db.mockInterview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  interface FormattedActivity {
    action: string;
    item: string;
    tech: string;
    time: string;
    color: string;
    timestamp: number;
  }

  const activities: FormattedActivity[] = [];

  latestQuestions.forEach((q) => {
    activities.push({
      action: "Added",
      item: q.title,
      tech: q.technology?.name || "General",
      time: formatDistanceToNow(new Date(q.createdAt), { addSuffix: true }),
      color: "text-blue-500",
      timestamp: new Date(q.createdAt).getTime(),
    });
  });

  latestRevisions.forEach((r) => {
    if (!r.question) return;
    const isMastered = r.question.revisionStatus === "MASTERED";
    activities.push({
      action: isMastered ? "Mastered" : "Revised",
      item: r.question.title,
      tech: r.question.technology?.name || "General",
      time: formatDistanceToNow(new Date(r.revisedAt), { addSuffix: true }),
      color: isMastered ? "text-purple-500" : "text-green-500",
      timestamp: new Date(r.revisedAt).getTime(),
    });
  });

  latestInterviews.forEach((i) => {
    activities.push({
      action: "Completed",
      item: `Mock Interview (Score: ${i.score ? Math.round(i.score) : 0}%)`,
      tech: i.technology,
      time: formatDistanceToNow(new Date(i.completedAt || i.createdAt), { addSuffix: true }),
      color: "text-rose-500",
      timestamp: new Date(i.completedAt || i.createdAt).getTime(),
    });
  });

  const recentActivity = activities
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  // 6. Heatmap Data (Revision records count by date)
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 364);
  oneYearAgo.setHours(0, 0, 0, 0);

  const revisionsLastYear = await db.revisionRecord.findMany({
    where: {
      userId,
      revisedAt: {
        gte: oneYearAgo,
      },
    },
    select: {
      revisedAt: true,
    },
  });

  const revisionCountsByDate: Record<string, number> = {};
  revisionsLastYear.forEach((rev) => {
    const dateStr = rev.revisedAt.toISOString().split("T")[0];
    revisionCountsByDate[dateStr] = (revisionCountsByDate[dateStr] || 0) + 1;
  });

  const heatmapData: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    heatmapData.push({
      date: dateStr,
      count: revisionCountsByDate[dateStr] || 0,
    });
  }

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  const stats = [
    {
      label: "Technologies",
      value: technologies.length,
      color: "from-indigo-500 to-indigo-600",
      change: `+${technologiesCreatedThisWeek} this week`,
    },
    {
      label: "Total Questions",
      value: totalQuestionsCount,
      color: "from-purple-500 to-purple-600",
      change: `+${questionsCreatedThisWeek} this week`,
    },
    {
      label: "Questions Revised",
      value: totalRevisions,
      color: "from-emerald-500 to-emerald-600",
      change: `+${revisionsToday} today`,
    },
    {
      label: "Due for Review",
      value: dueCount,
      color: "from-amber-500 to-amber-600",
      change: `${overdueCount} overdue`,
    },
    {
      label: "Readiness Score",
      value: readinessScore,
      suffix: "%",
      color: "from-blue-500 to-blue-600",
      change: `+${readinessChange}% this week`,
    },
    {
      label: "Mock Interviews",
      value: totalInterviews,
      color: "from-rose-500 to-rose-600",
      change: `Avg: ${avgScore}%`,
    },
  ];

  return (
    <DashboardClient
      userName={userName}
      stats={stats}
      techProgress={techProgress}
      recentActivity={recentActivity}
      dueCount={dueCount}
      weeks={weeks}
    />
  );
}
