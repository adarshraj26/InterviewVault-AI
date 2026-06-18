"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { NoteType } from "@prisma/client";

export async function getNotes(technologyId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return await db.note.findMany({
    where: {
      userId: session.user.id,
      ...(technologyId ? { technologyId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      technology: {
        select: { name: true, slug: true },
      },
    },
  });
}

export async function createNote(data: {
  title: string;
  content: string;
  type: NoteType;
  technologyId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const note = await db.note.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    revalidatePath("/notes");
    revalidatePath("/technologies");
    return { success: true, note };
  } catch (error) {
    console.error("Create note error:", error);
    return { error: "Failed to create note" };
  }
}

export async function updateNote(
  id: string,
  data: {
    title?: string;
    content?: string;
    type?: NoteType;
    technologyId?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const note = await db.note.update({
      where: {
        id,
        userId: session.user.id,
      },
      data,
    });

    revalidatePath("/notes");
    return { success: true, note };
  } catch (error) {
    console.error("Update note error:", error);
    return { error: "Failed to update note" };
  }
}

export async function deleteNote(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await db.note.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    revalidatePath("/notes");
    return { success: true };
  } catch (error) {
    console.error("Delete note error:", error);
    return { error: "Failed to delete note" };
  }
}
