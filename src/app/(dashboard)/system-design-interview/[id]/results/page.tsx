import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SystemDesignResultsClient from "./SystemDesignResultsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SystemDesignResultsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const interview = await db.systemDesignInterview.findUnique({
    where: {
      id,
      userId: session.user.id,
    }
  });

  if (!interview || !interview.completedAt) {
    redirect("/mock-interview");
  }

  return (
    <div className="container py-8">
      <SystemDesignResultsClient interview={interview} />
    </div>
  );
}
