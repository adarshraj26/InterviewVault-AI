import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LiveInterview from "../LiveInterview";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MockInterviewLivePage({ params }: PageProps) {
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

  if (!interview) {
    redirect("/mock-interview");
  }

  // If already completed, redirect to results
  if (interview.completedAt) {
    redirect(`/mock-interview/${id}/results`);
  }

  return (
    <div className="container py-8">
      <LiveInterview interview={interview} initialQuestions={interview.questions} />
    </div>
  );
}
