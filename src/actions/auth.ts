"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from "@/lib/validators/auth";
import { AuthError } from "next-auth";

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

    await signIn("credentials", {
      email: validated.data.email,
      password: validated.data.password,
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

export async function forgotPassword(email: string) {
  try {
    const user = await db.user.findUnique({ where: { email } });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return { success: "If an account exists, a reset link has been sent." };
    }

    // TODO: Implement email sending with Resend
    // For now, just return success
    return { success: "If an account exists, a reset link has been sent." };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
