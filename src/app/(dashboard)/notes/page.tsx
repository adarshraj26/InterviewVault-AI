import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotesClient from "./NotesClient";

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch all user notes
  const notes = await db.note.findMany({
    where: { userId: session.user.id },
    include: {
      technology: {
        select: { name: true, slug: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch all technologies: user's own + admin global templates
  const technologies = await db.technology.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { isGlobalTemplate: true },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container py-8">
      <NotesClient initialNotes={notes} technologies={technologies} />
    </div>
  );
}
