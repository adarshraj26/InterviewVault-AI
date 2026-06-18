"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export async function getTechnologies() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return await db.technology.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      questions: {
        select: {
          revisionStatus: true,
        },
      },
    },
  });
}

export async function getTechnologyBySlug(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return await db.technology.findUnique({
    where: {
      userId_slug: {
        userId: session.user.id,
        slug,
      },
    },
    include: {
      questions: {
        orderBy: { createdAt: "desc" },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
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

    const tech = await db.technology.update({
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
    revalidatePath(`/technologies/${tech.slug}`);
    revalidatePath("/dashboard");
    return { success: true, technology: tech };
  } catch (error) {
    console.error("Update technology error:", error);
    return { error: "Failed to update technology" };
  }
}
