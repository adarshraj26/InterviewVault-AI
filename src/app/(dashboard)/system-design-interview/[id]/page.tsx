import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SystemDesignWorkspace from "../SystemDesignWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SystemDesignLivePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const interview = await db.systemDesignInterview.findUnique({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  if (!interview) {
    redirect("/mock-interview");
  }

  // If already completed, redirect to results page
  if (interview.completedAt) {
    redirect(`/system-design-interview/${id}/results`);
  }

  return (
    <div className="fixed inset-0 top-16 bg-background z-[150] overflow-hidden flex flex-col">
      <SystemDesignWorkspace interview={interview} initialVersions={interview.versions} />
    </div>
  );
}
