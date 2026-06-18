"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

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
