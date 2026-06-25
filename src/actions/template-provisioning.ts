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
  if (!session?.user?.id) return { authorized: false as const, error: "Unauthorized" };

  if (session.user.email === SUPER_ADMIN_EMAIL) {
    return { authorized: true as const, userId: session.user.id };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPER_ADMIN) {
    return { authorized: false as const, error: "Forbidden: Admin only" };
  }

  return { authorized: true as const, userId: session.user.id };
}

// ── Clone a technology + questions into a target user's account ──

async function cloneTechnologyForUser(
  templateTech: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    order: number;
  },
  targetUserId: string
) {
  // Check if the user already has a technology with this slug
  const existing = await db.technology.findUnique({
    where: {
      userId_slug: {
        userId: targetUserId,
        slug: templateTech.slug,
      },
    },
  });

  if (existing) {
    // User already has this tech (maybe they created it themselves, or it was previously provisioned)
    // Don't overwrite — respect user independence
    return { skipped: true, techId: existing.id };
  }

  // Create the user's personal copy of the technology
  const userTech = await db.technology.create({
    data: {
      name: templateTech.name,
      slug: templateTech.slug,
      icon: templateTech.icon,
      description: templateTech.description,
      order: templateTech.order,
      isGlobal: false,
      isGlobalTemplate: false,
      sourceTemplateId: templateTech.id,
      userId: targetUserId,
    },
  });

  // Fetch all questions from the admin's template technology
  const templateQuestions = await db.question.findMany({
    where: { technologyId: templateTech.id },
    orderBy: { createdAt: "asc" },
  });

  // Clone each question into the user's copy
  if (templateQuestions.length > 0) {
    await db.question.createMany({
      data: templateQuestions.map((q) => ({
        title: q.title,
        answer: q.answer,
        codeExample: q.codeExample,
        codeLanguage: q.codeLanguage,
        theoryExample: q.theoryExample,
        difficulty: q.difficulty,
        interviewFrequency: q.interviewFrequency,
        tags: q.tags,
        followUpQuestions: q.followUpQuestions,
        technologyId: userTech.id,
        userId: targetUserId,
        isGlobal: false,
        isPublic: false,
        isCommunityShared: false,
        sourceTemplateQuestionId: q.id,
        // revisionStatus defaults to NOT_STARTED — fresh start for the user
      })),
    });
  }

  return { skipped: false, techId: userTech.id, questionsCloned: templateQuestions.length };
}

// ── Toggle Global Template (Admin Only) ────────────────────

export async function toggleGlobalTemplate(techId: string, enabled: boolean) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    // Verify the technology exists and belongs to the admin
    const tech = await db.technology.findUnique({
      where: { id: techId },
    });

    if (!tech) return { error: "Technology not found" };
    if (tech.userId !== check.userId) return { error: "You can only toggle your own technologies" };

    // Update the template flag
    await db.technology.update({
      where: { id: techId },
      data: {
        isGlobalTemplate: enabled,
        isGlobal: enabled, // Keep isGlobal in sync for backward compat
      },
    });

    revalidatePath("/technologies");
    revalidatePath("/dashboard");
    return {
      success: true,
      enabled,
      message: enabled ? "Template is now globally visible." : "Template hidden from global view.",
    };
  } catch (error: any) {
    console.error("Toggle global template error:", error);
    return { error: `Failed to toggle global template status: ${error?.message || String(error)}` };
  }
}

// ── User Triggered Action: Create Personal Copy ────────────

export async function createPersonalCopy(templateTechId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const template = await db.technology.findUnique({
      where: { id: templateTechId }
    });

    if (!template || !template.isGlobalTemplate) {
      return { error: "Official template not found or no longer available." };
    }

    const result = await cloneTechnologyForUser(template, session.user.id);
    
    revalidatePath("/technologies");
    revalidatePath(`/technologies/${template.slug}`);
    
    return { success: true, skipped: result.skipped, techId: result.techId };
  } catch (error: any) {
    console.error("Failed to create personal copy:", error);
    return { error: "Failed to create personal copy" };
  }
}

// ── Get Template Status (Admin info) ─────────────────────────

export async function getTemplateStatus(techId: string) {
  const check = await verifyAdmin();
  if (!check.authorized) return { error: check.error };

  try {
    const tech = await db.technology.findUnique({
      where: { id: techId },
      select: { isGlobalTemplate: true, id: true, name: true },
    });

    if (!tech) return { error: "Technology not found" };

    // Count how many user copies exist
    const userCopies = await db.technology.count({
      where: { sourceTemplateId: techId },
    });

    return {
      success: true,
      isGlobalTemplate: tech.isGlobalTemplate,
      name: tech.name,
      userCopies,
    };
  } catch (error) {
    console.error("Get template status error:", error);
    return { error: "Failed to get template status" };
  }
}
