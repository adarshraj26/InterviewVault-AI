"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { UserRole, SubscriptionPlan } from "@prisma/client";
import { SUPER_ADMIN_EMAIL } from "@/constants";

// Helper strictly for Super Admin
export async function verifySuperAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.email !== SUPER_ADMIN_EMAIL) {
    return { authorized: false, error: "Unauthorized: Super Admin access required" };
  }
  return { authorized: true, userId: session.user.id };
}

// Helper to ensure current user is ADMIN or SUPER_ADMIN
export async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { authorized: false, error: "Unauthorized" };
  }

  // Super Admin bypass
  if (session.user.email === SUPER_ADMIN_EMAIL) {
    return { authorized: true, isSuperAdmin: true, userId: session.user.id };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPER_ADMIN) {
    return { authorized: false, isSandbox: true, userId: session.user.id };
  }

  return { 
    authorized: true, 
    isSuperAdmin: user?.role === UserRole.SUPER_ADMIN,
    userId: session.user.id 
  };
}

export async function getAdminData() {
  try {
    const adminCheck = await verifyAdmin();
    if (!adminCheck.authorized && !adminCheck.isSandbox) {
      return { error: "Unauthorized" };
    }

    // 1. Fetch platform statistics
    const totalUsers = await db.user.count();
    const totalQuestions = await db.question.count();
    const publicQuestions = await db.question.count({
      where: { isPublic: true },
    });
    
    const creditAggregate = await db.aICredit.aggregate({
      _sum: {
        used: true,
      },
    });
    const aiCreditsUsed = creditAggregate._sum.used || 0;

    // 2. Fetch users with subscription plans & question counts
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
          },
        },
        aiCredits: {
          select: {
            credits: true,
            used: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    const serializedUsers = users.map((u) => ({
      id: u.id,
      name: u.name || "Anonymous",
      email: u.email,
      role: u.role,
      plan: u.subscription?.plan || SubscriptionPlan.FREE,
      questionsCount: u._count.questions,
      credits: u.aiCredits?.credits || 50,
      creditsUsed: u.aiCredits?.used || 0,
      createdAt: u.createdAt.toISOString(),
    }));

    // 3. Fetch public questions shared to the community library for moderation
    const communityQuestions = await db.question.findMany({
      where: { isPublic: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        difficulty: true,
        updatedAt: true,
        technology: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const serializedQuestions = communityQuestions.map((q) => ({
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      tech: q.technology?.name || "General",
      authorName: q.user?.name || "Anonymous",
      authorEmail: q.user?.email || "",
      updatedAt: q.updatedAt.toISOString(),
    }));

    return {
      stats: {
        totalUsers,
        totalQuestions,
        publicQuestions,
        aiCreditsUsed,
      },
      users: serializedUsers,
      communityQuestions: serializedQuestions,
      isSandbox: !!adminCheck.isSandbox,
      isSuperAdmin: !!adminCheck.isSuperAdmin,
    };
  } catch (error) {
    console.error("Admin data fetch error:", error);
    return { error: "Failed to fetch admin dashboard details." };
  }
}

export async function toggleUserRole(targetUserId: string) {
  try {
    const adminCheck = await verifySuperAdmin();
    if (!adminCheck.authorized) {
      return { error: "Permission Denied: Only Super Admin can change roles." };
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, role: true },
    });

    if (!user) {
      return { error: "User not found" };
    }

    if (user.email === SUPER_ADMIN_EMAIL) {
      return { error: "Cannot modify the Super Admin's role." };
    }

    const nextRole = user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN;
    await db.user.update({
      where: { id: targetUserId },
      data: { role: nextRole },
    });

    revalidatePath("/admin");
    return { success: true, role: nextRole };
  } catch (error) {
    console.error("Role toggle error:", error);
    return { error: "Failed to toggle user role." };
  }
}

export async function toggleUserPlan(targetUserId: string) {
  try {
    const adminCheck = await verifySuperAdmin();
    if (!adminCheck.authorized) {
      return { error: "Permission Denied: Only Super Admin can adjust billing." };
    }

    const sub = await db.subscription.findUnique({
      where: { userId: targetUserId },
      select: { plan: true },
    });

    const nextPlan = sub?.plan === SubscriptionPlan.PRO ? SubscriptionPlan.FREE : SubscriptionPlan.PRO;

    await db.subscription.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        plan: nextPlan,
      },
      update: {
        plan: nextPlan,
      },
    });

    revalidatePath("/admin");
    return { success: true, plan: nextPlan };
  } catch (error) {
    console.error("Plan toggle error:", error);
    return { error: "Failed to toggle subscription plan." };
  }
}

export async function adjustUserCredits(targetUserId: string, amount: number) {
  try {
    const adminCheck = await verifySuperAdmin();
    if (!adminCheck.authorized) {
      return { error: "Permission Denied: Only Super Admin can allocate credits." };
    }

    const credit = await db.aICredit.findUnique({
      where: { userId: targetUserId },
    });

    const newCredits = Math.max(0, (credit?.credits || 50) + amount);

    await db.aICredit.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        credits: newCredits,
      },
      update: {
        credits: newCredits,
      },
    });

    revalidatePath("/admin");
    return { success: true, credits: newCredits };
  } catch (error) {
    console.error("Credit adjustment error:", error);
    return { error: "Failed to adjust user credits." };
  }
}

export async function moderateQuestion(questionId: string, action: "unpublish" | "delete") {
  try {
    const adminCheck = await verifyAdmin();
    if (!adminCheck.authorized) {
      if (adminCheck.isSandbox) {
        return { error: "Permission Denied: Sandbox mode restricts question deletion and unpublishing." };
      }
      return { error: "Unauthorized" };
    }

    if (action === "unpublish") {
      await db.question.update({
        where: { id: questionId },
        data: { isPublic: false },
      });
    } else {
      await db.question.delete({
        where: { id: questionId },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/community");
    return { success: true };
  } catch (error) {
    console.error("Moderation error:", error);
    return { error: "Failed to moderate community question." };
  }
}

export async function selfPromoteToAdmin() {
  return { error: "Self-promotion is permanently disabled for security reasons." };
}
