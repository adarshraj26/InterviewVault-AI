"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

async function getCurrentUserRole(userId: string): Promise<UserRole> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role ?? UserRole.USER;
}

export async function getTechnologies() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Fetch the user's personal technologies
  const personalTechs = await db.technology.findMany({
    where: { userId: session.user.id, isGlobal: false },
    orderBy: { order: "asc" },
    include: {
      questions: {
        select: { revisionStatus: true },
      },
    },
  });

  // Fetch all global technologies (admin-created, visible to everyone)
  const globalTechs = await db.technology.findMany({
    where: { isGlobal: true },
    orderBy: { order: "asc" },
    include: {
      questions: {
        select: { revisionStatus: true },
      },
    },
  });

  // Return both, global first, then personal
  // Mark them with the isGlobal flag so the UI can badge them correctly
  return [...globalTechs, ...personalTechs];
}

export async function getTechnologyBySlug(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Try personal technology first
  let tech = await db.technology.findUnique({
    where: {
      userId_slug: {
        userId: session.user.id,
        slug,
      },
    },
    include: {
      questions: {
        orderBy: { createdAt: "asc" },
        include: {
          revisionRecords: {
            orderBy: { revisedAt: "desc" },
            take: 1,
          },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Fall back to global technology if no personal one found
  if (!tech) {
    const globalTech = await db.technology.findFirst({
      where: { slug, isGlobal: true },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
      },
    });

    if (globalTech) {
      // Merge global questions with user's personal questions in this global tech
      const globalQuestions = await db.question.findMany({
        where: { technologyId: globalTech.id, isGlobal: true },
        orderBy: { createdAt: "asc" },
        include: {
          revisionRecords: {
            where: { userId: session.user.id },
            orderBy: { revisedAt: "desc" },
            take: 1,
          },
        },
      });

      // Find any personal questions the user added to this global tech
      const personalQuestionsInGlobal = await db.question.findMany({
        where: { technologyId: globalTech.id, userId: session.user.id, isGlobal: false },
        orderBy: { createdAt: "asc" },
        include: {
          revisionRecords: {
            where: { userId: session.user.id },
            orderBy: { revisedAt: "desc" },
            take: 1,
          },
        },
      });

      tech = {
        ...globalTech,
        questions: [...globalQuestions, ...personalQuestionsInGlobal],
      } as any;
    }
  }

  return tech;
}

export async function createTechnology(name: string, description?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const slug = slugify(name);
    const existing = await db.technology.findUnique({
      where: {
        userId_slug: {
          userId: session.user.id,
          slug,
        },
      },
    });

    if (existing) {
      return { error: "Technology workspace already exists" };
    }

    const tech = await db.technology.create({
      data: {
        name,
        slug,
        description,
        userId: session.user.id,
        isGlobal: false,
      },
    });

    revalidatePath("/technologies");
    revalidatePath("/dashboard");
    return { success: true, technology: tech };
  } catch (error) {
    console.error("Create technology error:", error);
    return { error: "Failed to create technology" };
  }
}

export async function deleteTechnology(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const tech = await db.technology.findUnique({ where: { id } });

    // Block non-admins from deleting global technologies
    if (tech?.isGlobal) {
      const role = await getCurrentUserRole(session.user.id);
      if (role !== UserRole.ADMIN) {
        return { error: "Permission denied: Cannot delete Official technologies" };
      }
    }

    await db.technology.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    revalidatePath("/technologies");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete technology error:", error);
    return { error: "Failed to delete technology" };
  }
}

export async function updateTechnology(id: string, name: string, description?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const tech = await db.technology.findUnique({ where: { id } });

    // Block non-admins from editing global technologies
    if (tech?.isGlobal) {
      const role = await getCurrentUserRole(session.user.id);
      if (role !== UserRole.ADMIN) {
        return { error: "Permission denied: Cannot edit Official technologies" };
      }
    }

    const slug = slugify(name);
    // Check if another technology (different ID) has the same slug for this user
    const existing = await db.technology.findFirst({
      where: {
        userId: session.user.id,
        slug,
        id: { not: id },
      },
    });

    if (existing) {
      return { error: "Another technology workspace with this name already exists" };
    }

    const updated = await db.technology.update({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        name,
        slug,
        description,
      },
    });

    revalidatePath("/technologies");
    revalidatePath(`/technologies/${updated.slug}`);
    revalidatePath("/dashboard");
    return { success: true, technology: updated };
  } catch (error) {
    console.error("Update technology error:", error);
    return { error: "Failed to update technology" };
  }
}


