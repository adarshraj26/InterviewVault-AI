import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CommunityDashboard from "./CommunityDashboard";

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch all public questions, including authors, likes, bookmarks, and technology
  const publicQuestions = await db.question.findMany({
    where: {
      isPublic: true,
    },
    include: {
      technology: {
        select: { name: true },
      },
      user: {
        select: { name: true, email: true },
      },
      likes: {
        select: { userId: true },
      },
      bookmarks: {
        select: { userId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container py-8">
      <CommunityDashboard 
        initialQuestions={publicQuestions} 
        currentUserId={session.user.id} 
      />
    </div>
  );
}
