"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// ── Existing actions (unchanged) ─────────────────────────────────

export async function updateProfile(name: string, image?: string) {
  const session = await auth();
  console.log("[updateProfile] session object:", JSON.stringify(session, null, 2));
  
  if (!session?.user?.id) {
    console.warn("[updateProfile] unauthorized: session.user.id is missing");
    return { error: "Unauthorized" };
  }

  try {
    console.log("[updateProfile] Updating user in DB:", session.user.id, { name, hasImage: !!image });
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        ...(image ? { image } : {}),
      },
    });
    console.log("[updateProfile] Update success:", updatedUser.id, updatedUser.name);

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[updateProfile] Update profile error:", error);
    return { error: "Failed to update profile" };
  }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // If signed in via credentials, verify existing password
    if (user.hashedPassword) {
      const passwordMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!passwordMatch) {
        return { error: "Incorrect current password" };
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: session.user.id },
      data: { hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Update password error:", error);
    return { error: "Failed to update password" };
  }
}

// ── New: Profile Picture Management ──────────────────────────────

/**
 * Returns the current avatar fields for the authenticated user.
 */
export async function getProfileImageData() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      profileImageUrl: true,
      googleImageUrl: true,
      selectedAvatarId: true,
      avatarType: true,
    },
  });

  if (!user) return { error: "User not found" };
  return { success: true, data: user };
}

/**
 * Set a custom uploaded photo as the active profile picture.
 * @param uploadedUrl - The UploadThing CDN URL returned after upload
 */
export async function setCustomProfileImage(uploadedUrl: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!uploadedUrl || typeof uploadedUrl !== "string" || !uploadedUrl.startsWith("http")) {
    return { error: "Invalid image URL" };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        profileImageUrl: uploadedUrl,
        avatarType: "CUSTOM_UPLOAD",
        image: uploadedUrl, // Keep NextAuth image field in sync
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("setCustomProfileImage error:", error);
    return { error: "Failed to save profile image" };
  }
}

/**
 * Select an avatar from the built-in library.
 * @param avatarId - Composite DiceBear id: "style::seed"
 */
export async function selectAvatarLibraryImage(avatarId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!avatarId || typeof avatarId !== "string") {
    return { error: "Invalid avatar ID" };
  }

  try {
    const { getAvatarUrl } = await import("@/lib/profile-image");
    const avatarUrl = getAvatarUrl(avatarId);

    await db.user.update({
      where: { id: session.user.id },
      data: {
        selectedAvatarId: avatarId,
        avatarType: "AVATAR_LIBRARY",
        image: avatarUrl, // Keep NextAuth image field in sync
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("selectAvatarLibraryImage error:", error);
    return { error: "Failed to save avatar selection" };
  }
}

/**
 * Remove the current custom/avatar photo. Falls back through priority chain:
 * GOOGLE → DEFAULT
 */
export async function removeProfileImage() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { googleImageUrl: true, avatarType: true },
    });

    // Determine what to fall back to
    const fallbackType = user?.googleImageUrl ? "GOOGLE" : "DEFAULT";
    const fallbackImage = user?.googleImageUrl ?? null;

    await db.user.update({
      where: { id: session.user.id },
      data: {
        profileImageUrl: null,
        selectedAvatarId: null,
        avatarType: fallbackType,
        image: fallbackImage,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true, fallback: fallbackType };
  } catch (error) {
    console.error("removeProfileImage error:", error);
    return { error: "Failed to remove profile image" };
  }
}

/**
 * Restore the Google profile picture as the active one (Google users only).
 */
export async function restoreGoogleProfileImage() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { googleImageUrl: true },
    });

    if (!user?.googleImageUrl) {
      return { error: "No Google profile picture available" };
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        avatarType: "GOOGLE",
        profileImageUrl: null,
        selectedAvatarId: null,
        image: user.googleImageUrl,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("restoreGoogleProfileImage error:", error);
    return { error: "Failed to restore Google image" };
  }
}

/**
 * Restore the default avatar (removes all custom choices).
 */
export async function restoreDefaultAvatar() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        avatarType: "DEFAULT",
        profileImageUrl: null,
        selectedAvatarId: null,
        image: null,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("restoreDefaultAvatar error:", error);
    return { error: "Failed to restore default avatar" };
  }
}
