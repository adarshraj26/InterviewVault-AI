import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MockInterviewDashboard from "./MockInterviewDashboard";

export default async function MockInterviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch technologies
  const technologies = await db.technology.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { order: "asc" },
  });

  // Fetch past interviews
  const pastInterviews = await db.mockInterview.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container py-8">
      <MockInterviewDashboard 
        technologies={technologies} 
        pastInterviews={pastInterviews} 
      />
    </div>
  );
}
