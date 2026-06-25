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

  const userId = session.user.id;

  // Fetch ALL technologies belonging to this user (Personal)
  // AND all Official Global Templates (isGlobalTemplate = true)
  const allTechs = await db.technology.findMany({
    where: {
      OR: [
        { userId },
        { isGlobalTemplate: true }
      ]
    },
    orderBy: { order: "asc" },
    include: {
      questions: {
        select: { revisionStatus: true, userId: true },
      },
    },
  });

  // Filter out Official technologies if the user has already created a personal copy of it
  // (A personal copy will have sourceTemplateId set to the Official technology's ID)
  const personalTechs = allTechs.filter(t => t.userId === userId);
  const clonedTemplateIds = new Set(
    personalTechs.filter(t => t.sourceTemplateId).map(t => t.sourceTemplateId)
  );

  const result = allTechs.filter(t => {
    // Keep all personal techs
    if (t.userId === userId) return true;
    
    // For Official techs, only keep them if the user hasn't cloned them
    return !clonedTemplateIds.has(t.id);
  });

  return result;
}

export async function getTechnologyBySlug(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // 1. Try to find the user's personal copy first
  let tech = await db.technology.findFirst({
    where: {
      userId: session.user.id,
      slug,
    },
    include: {
      questions: {
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          revisionRecords: {
            where: { userId: session.user.id },
            orderBy: { revisedAt: "desc" },
            take: 1,
          },
        },
      },
      notes: {
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // 2. If no personal copy, look for an Official Global Template
  if (!tech) {
    tech = await db.technology.findFirst({
      where: {
        isGlobalTemplate: true,
        slug,
      },
      include: {
        questions: {
          orderBy: { createdAt: "asc" },
          // We must NOT fetch revision records for global questions since they belong to admin
          // Users cannot have revision records on questions they don't own
        },
        // We do not fetch notes for global templates since notes are personal
      },
    }) as any;
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
        isGlobalTemplate: false,
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

    if (!tech) {
      return { error: "Technology not found" };
    }

    // Only allow deletion if:
    // 1. It's the user's own tech, OR
    // 2. The user is admin and it's their template
    if (tech.userId !== session.user.id) {
      return { error: "Permission denied: You can only delete your own technologies" };
    }

    await db.technology.delete({
      where: { id },
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

    if (!tech) {
      return { error: "Technology not found" };
    }

    if (tech.userId !== session.user.id) {
      return { error: "Permission denied: You can only edit your own technologies" };
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
      where: { id },
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
