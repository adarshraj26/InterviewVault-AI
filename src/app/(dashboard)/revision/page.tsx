import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RevisionDashboard from "./RevisionDashboard";

export default async function RevisionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Load all user questions with their technology name and revision records
  const questions = await db.question.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      technology: {
        select: { name: true, slug: true },
      },
      revisionRecords: {
        orderBy: { revisedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate stats
  const now = new Date();
  
  // Calculate streak (consecutive days with at least one revision)
  // Simple calculation: let's query the revision history count
  const allRevisions = await db.revisionRecord.findMany({
    where: { userId: session.user.id },
    select: { revisedAt: true },
    orderBy: { revisedAt: "desc" },
  });

  let streak = 0;
  if (allRevisions.length > 0) {
    // Basic streak calculator
    const uniqueDays = new Set<string>();
    allRevisions.forEach((r) => {
      uniqueDays.add(r.revisedAt.toISOString().split("T")[0]);
    });
    
    const sortedDays = Array.from(uniqueDays).sort().reverse();
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Check if user has revised today or yesterday to continue streak
    if (sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr) {
      streak = 1;
      let checkDate = new Date();
      if (sortedDays[0] === yesterdayStr) {
        checkDate = yesterday;
      }
      
      for (let i = 1; i < sortedDays.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkStr = checkDate.toISOString().split("T")[0];
        if (sortedDays[i] === checkStr) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // Calculate due count
  const dueCount = questions.filter((q) => {
    const lastRec = q.revisionRecords[0];
    return !lastRec?.nextReviewAt || new Date(lastRec.nextReviewAt) <= now;
  }).length;

  return (
    <div className="container py-8">
      <RevisionDashboard 
        initialQuestions={questions} 
        streak={streak} 
        dueCount={dueCount} 
      />
    </div>
  );
}
