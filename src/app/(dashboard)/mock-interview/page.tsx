import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MockInterviewDashboard from "./MockInterviewDashboard";

export default async function MockInterviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch personal technologies owned by this user
  const personalTechs = await db.technology.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { order: "asc" },
  });

  // Fetch global/official technologies (created by admin, available to everyone)
  const globalTechs = await db.technology.findMany({
    where: { isGlobalTemplate: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Merge: personal first, then global. Deduplicate by lowercased name.
  const seenNames = new Set<string>(personalTechs.map((t) => t.name.toLowerCase()));
  const dedupedGlobalTechs = globalTechs
    .filter((t) => !seenNames.has(t.name.toLowerCase()))
    .map((t) => ({ ...t, isGlobal: true }));

  const technologies = [
    ...personalTechs.map((t) => ({ ...t, isGlobal: false })),
    ...dedupedGlobalTechs,
  ];

  // Fetch past interviews
  const pastInterviews = await db.mockInterview.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Fetch past system design interviews
  const pastSystemDesignInterviews = await db.systemDesignInterview.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container py-8">
      <MockInterviewDashboard
        technologies={technologies}
        pastInterviews={pastInterviews}
        pastSystemDesignInterviews={pastSystemDesignInterviews}
      />
    </div>
  );
}
