import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Load user details
  const dbUser = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      image: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch active resume
  const activeResume = await db.resume.findFirst({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
    include: {
      skills: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="container py-8">
      <SettingsForm 
        user={dbUser} 
        activeResume={activeResume ? {
          id: activeResume.id,
          fileName: activeResume.fileName,
          fileSize: activeResume.fileSize,
          parsedAt: activeResume.parsedAt,
          createdAt: activeResume.createdAt,
          skills: activeResume.skills,
          rawText: activeResume.rawText,
        } : null} 
      />
    </div>
  );
}
