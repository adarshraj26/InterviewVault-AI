"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from "@/lib/validators/auth";
import { AuthError } from "next-auth";
import { SUPER_ADMIN_EMAIL } from "@/constants";
import { UserRole } from "@prisma/client";

export async function registerUser(data: RegisterInput) {
  try {
    const validated = registerSchema.safeParse(data);
    if (!validated.success) {
      return { error: validated.error.issues[0].message };
    }

    const { name, email, password } = validated.data;

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "An account with this email already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: email === SUPER_ADMIN_EMAIL ? UserRole.SUPER_ADMIN : UserRole.USER,
      },
    });

    // Create default AI credits
    await db.aICredit.create({
      data: {
        userId: user.id,
        credits: 50,
      },
    });

    // Create default subscription
    await db.subscription.create({
      data: {
        userId: user.id,
        plan: "FREE",
      },
    });

    return { success: "Account created successfully! Please sign in." };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}



export async function loginUser(data: LoginInput) {
  try {
    const validated = loginSchema.safeParse(data);
    if (!validated.success) {
      return { error: validated.error.issues[0].message };
    }

    const { email, password } = validated.data;

    // Pre-check: does the user exist and is their email verified?
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, hashedPassword: true },
    });

    // If email+password user exists but hasn't verified their email
    if (user && user.hashedPassword && !user.emailVerified) {
      return { error: "EMAIL_NOT_VERIFIED", email };
    }

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });

    return { success: "Signed in successfully!" };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error; // Re-throw for redirect
  }
}

