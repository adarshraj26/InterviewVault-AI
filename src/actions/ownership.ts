"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { SUPER_ADMIN_EMAIL } from "@/constants";

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

  if (session.user.email === SUPER_ADMIN_EMAIL) {
    return { authorized: true, userId: session.user.id };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPER_ADMIN) {
    return { authorized: false, error: "Forbidden: Admin only" as const };
  }

  return { authorized: true, userId: session.user.id };
}

// ── Save to My Vault (All Users) ────────────────────────────
// Copies a question from community / another context into user's personal vault

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
          isGlobalTemplate: false,
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
        sourceTemplateQuestionId: original.id,
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
    // Return admin's technologies that are marked as global templates
    const techs = await db.technology.findMany({
      where: {
        isGlobalTemplate: true,
        userId: check.userId,
      },
      orderBy: { order: "asc" },
      include: {
        questions: {
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
