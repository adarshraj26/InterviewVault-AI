"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Backfills googleImageUrl for existing Google users whose googleImageUrl
 * was null before the avatar system was introduced.
 *
 * Image source priority:
 *  1. dbUser.image  (NextAuth stored this at account creation)
 *  2. session.user.image  (comes from token.picture — set by Google OAuth)
 *
 * Safe to call multiple times — idempotent.
 */
export async function backfillGoogleImageUrl(): Promise<{ backfilled: boolean; imageUrl: string | null }> {
  const session = await auth();
  if (!session?.user?.id) return { backfilled: false, imageUrl: null };

  const userId = session.user.id;

  // Check current DB state
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      image:          true,
      googleImageUrl: true,
      avatarType:     true,
    },
  });

  if (!dbUser) return { backfilled: false, imageUrl: null };

  // Already has googleImageUrl — nothing to backfill
  if (dbUser.googleImageUrl) {
    return { backfilled: false, imageUrl: dbUser.googleImageUrl };
  }

  // Confirm the user has a Google account linked
  const googleAccount = await db.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!googleAccount) return { backfilled: false, imageUrl: null };

  // Try multiple sources for the Google profile picture:
  // 1. DB User.image (set by NextAuth at account creation)
  // 2. session.user.image (from token.picture — always present for active Google sessions)
  const googleImage =
    dbUser.image ||
    session.user.image ||
    null;

  if (!googleImage) {
    console.warn("[backfill] Google user has no image in DB or session:", userId);
    return { backfilled: false, imageUrl: null };
  }

  // Write the backfill — update both googleImageUrl AND User.image for consistency
  const shouldSetGoogleType =
    !dbUser.avatarType || dbUser.avatarType === "DEFAULT" || dbUser.avatarType === "GOOGLE";

  await db.user.update({
    where: { id: userId },
    data: {
      image:          googleImage,
      googleImageUrl: googleImage,
      ...(shouldSetGoogleType ? { avatarType: "GOOGLE" } : {}),
    },
  });

  revalidatePath("/settings");
  return { backfilled: true, imageUrl: googleImage };
}
