"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { UserRole, Difficulty, InterviewFrequency } from "@prisma/client";

// ── Helpers ─────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { authorized: false, error: "Unauthorized" as const };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== UserRole.ADMIN) {
    return { authorized: false, error: "Forbidden: Admin only" as const };
  }

  return { authorized: true, userId: session.user.id };
}

// ── Global Technology Management (Admin Only) ────────────────

export async function createGlobalTechnology(
  name: string,
  description?: string,
  icon?: string
) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    const slug = slugify(name);

    // Check if a global tech with this slug already exists
    const existing = await db.technology.findFirst({
      where: { slug, isGlobal: true },
    });

    if (existing) {
      return { error: `Global technology "${name}" already exists` };
    }

    const tech = await db.technology.create({
      data: {
        name,
        slug,
        description,
        icon,
        isGlobal: true,
        userId: check.userId!, // admin is the owner
      },
    });

    revalidatePath("/technologies");
    revalidatePath("/dashboard");
    return { success: true, technology: tech };
  } catch (error) {
    console.error("Create global technology error:", error);
    return { error: "Failed to create global technology" };
  }
}

export async function updateGlobalTechnology(
  id: string,
  name: string,
  description?: string,
  icon?: string
) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    const tech = await db.technology.findUnique({ where: { id } });
    if (!tech || !tech.isGlobal) return { error: "Global technology not found" };

    const slug = slugify(name);
    const updated = await db.technology.update({
      where: { id },
      data: { name, slug, description, icon },
    });

    revalidatePath("/technologies");
    revalidatePath(`/technologies/${slug}`);
    return { success: true, technology: updated };
  } catch (error) {
    console.error("Update global technology error:", error);
    return { error: "Failed to update global technology" };
  }
}

export async function deleteGlobalTechnology(id: string) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    const tech = await db.technology.findUnique({ where: { id } });
    if (!tech || !tech.isGlobal) return { error: "Global technology not found" };

    await db.technology.delete({ where: { id } });

    revalidatePath("/technologies");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete global technology error:", error);
    return { error: "Failed to delete global technology" };
  }
}

// ── Global Question Management (Admin Only) ─────────────────

export async function createGlobalQuestion(data: {
  title: string;
  answer?: string | null;
  codeExample?: string | null;
  codeLanguage?: string | null;
  theoryExample?: string | null;
  difficulty: Difficulty;
  interviewFrequency: InterviewFrequency;
  tags: string[];
  technologyId: string;
}) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    // Verify the technology is also global
    const tech = await db.technology.findUnique({ where: { id: data.technologyId } });
    if (!tech) return { error: "Technology not found" };

    const question = await db.question.create({
      data: {
        ...data,
        userId: check.userId!,
        isGlobal: true,
      },
    });

    revalidatePath(`/technologies/${tech.slug}`);
    return { success: true, question };
  } catch (error) {
    console.error("Create global question error:", error);
    return { error: "Failed to create global question" };
  }
}

export async function updateGlobalQuestion(
  id: string,
  data: {
    title?: string;
    answer?: string | null;
    codeExample?: string | null;
    codeLanguage?: string | null;
    theoryExample?: string | null;
    difficulty?: Difficulty;
    interviewFrequency?: InterviewFrequency;
    tags?: string[];
  }
) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    const question = await db.question.findUnique({
      where: { id },
      include: { technology: { select: { slug: true } } },
    });
    if (!question || !question.isGlobal) return { error: "Global question not found" };

    const updated = await db.question.update({ where: { id }, data });

    revalidatePath(`/technologies/${question.technology.slug}`);
    return { success: true, question: updated };
  } catch (error) {
    console.error("Update global question error:", error);
    return { error: "Failed to update global question" };
  }
}

export async function deleteGlobalQuestion(id: string) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    const question = await db.question.findUnique({
      where: { id },
      include: { technology: { select: { slug: true } } },
    });
    if (!question || !question.isGlobal) return { error: "Global question not found" };

    await db.question.delete({ where: { id } });

    revalidatePath(`/technologies/${question.technology.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Delete global question error:", error);
    return { error: "Failed to delete global question" };
  }
}

// ── Save to My Vault (All Users) ────────────────────────────

export async function saveToMyVault(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const original = await db.question.findUnique({
      where: { id: questionId },
      include: { technology: true },
    });

    if (!original) return { error: "Question not found" };

    // Check if user already has a vault copy of this question
    const alreadySaved = await db.question.findFirst({
      where: {
        userId: session.user.id,
        title: original.title,
        technologyId: original.technologyId,
        isGlobal: false,
      },
    });

    if (alreadySaved) {
      return { error: "You already have this question in your vault" };
    }

    // Find or create user's personal technology workspace for this slug
    let personalTech = await db.technology.findUnique({
      where: {
        userId_slug: {
          userId: session.user.id,
          slug: original.technology.slug,
        },
      },
    });

    if (!personalTech) {
      // Create a personal mirror workspace for this technology
      personalTech = await db.technology.create({
        data: {
          name: original.technology.name,
          slug: original.technology.slug,
          description: original.technology.description,
          icon: original.technology.icon,
          isGlobal: false,
          userId: session.user.id,
        },
      });
    }

    // Duplicate the question as a personal copy
    const copy = await db.question.create({
      data: {
        title: original.title,
        answer: original.answer,
        codeExample: original.codeExample,
        codeLanguage: original.codeLanguage,
        theoryExample: original.theoryExample,
        difficulty: original.difficulty,
        interviewFrequency: original.interviewFrequency,
        tags: original.tags,
        followUpQuestions: original.followUpQuestions,
        technologyId: personalTech.id,
        userId: session.user.id,
        isGlobal: false,
        isCommunityShared: false,
      },
    });

    revalidatePath("/technologies");
    revalidatePath(`/technologies/${original.technology.slug}`);
    return { success: true, question: copy, message: "Saved to your vault! You can now edit it." };
  } catch (error) {
    console.error("Save to vault error:", error);
    return { error: "Failed to save to vault" };
  }
}

// ── Community Share Toggle (All Users, own questions only) ──

export async function toggleCommunityShare(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const question = await db.question.findUnique({
      where: { id: questionId, userId: session.user.id },
    });

    if (!question) return { error: "Question not found or not yours" };
    if (question.isGlobal) return { error: "Cannot toggle community share on global questions" };

    const updated = await db.question.update({
      where: { id: questionId },
      data: {
        isCommunityShared: !question.isCommunityShared,
        isPublic: !question.isCommunityShared, // keep in sync with legacy field
      },
    });

    revalidatePath("/community");
    revalidatePath("/technologies");
    return { success: true, isCommunityShared: updated.isCommunityShared };
  } catch (error) {
    console.error("Toggle community share error:", error);
    return { error: "Failed to toggle community share" };
  }
}

// ── Get Global Technologies (for admin management) ──────────

export async function getGlobalTechnologies() {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    const techs = await db.technology.findMany({
      where: { isGlobal: true },
      orderBy: { order: "asc" },
      include: {
        questions: {
          where: { isGlobal: true },
          select: { id: true, title: true, difficulty: true },
        },
      },
    });
    return { success: true, technologies: techs };
  } catch (error) {
    console.error("Get global technologies error:", error);
    return { error: "Failed to fetch global technologies" };
  }
}
