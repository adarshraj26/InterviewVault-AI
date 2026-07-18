"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { SUPER_ADMIN_EMAIL } from "@/constants";
import { UserRole } from "@prisma/client";
import { sendEmail } from "@/lib/mail";

// ── Generate a 6-digit OTP ────────────────────────────────
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Step 1: Validate form, send OTP, store pending registration ──
export async function sendRegistrationOtp(data: RegisterInput) {
  try {
    const validated = registerSchema.safeParse(data);
    if (!validated.success) {
      return { error: validated.error.issues[0].message };
    }

    const { name, email, password } = validated.data;

    // Check if account already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "An account with this email already exists. Please sign in instead." };
    }

    // Delete any previous OTP for this email
    await db.emailOtp.deleteMany({ where: { email } });

    // Hash the password now so we can store it safely
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP — expires in 10 minutes
    const code      = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.emailOtp.create({
      data: { email, code, name, password: hashedPassword, expiresAt },
    });

    // ── Send OTP email via Mailer ────────────────────────────
    const result = await sendEmail({
      to: email,
      subject: "Your InterviewVault AI Verification Code",
      html: buildOtpEmail(name, code),
      code,
    });

    if (!result.success) {
      await db.emailOtp.deleteMany({ where: { email } });
      return { error: result.error ?? "Failed to send verification email. Please try again." };
    }

    return {
      success: true,
      devNote: result.devNote,
    };
  } catch (error) {
    console.error("[OTP] sendRegistrationOtp unexpected error:", error);
    return { error: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// ── Step 2: Verify OTP and create account ─────────────────
export async function verifyOtpAndRegister(email: string, code: string) {
  try {
    const record = await db.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return { error: "No verification request found. Please start over." };
    }

    if (new Date() > record.expiresAt) {
      await db.emailOtp.delete({ where: { id: record.id } });
      return { error: "Verification code has expired. Please request a new one." };
    }

    if (record.attempts >= 5) {
      await db.emailOtp.delete({ where: { id: record.id } });
      return { error: "Too many incorrect attempts. Please request a new code." };
    }

    if (record.code !== code.trim()) {
      await db.emailOtp.update({
        where: { id: record.id },
        data:  { attempts: record.attempts + 1 },
      });
      const remaining = 5 - (record.attempts + 1);
      return { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
    }

    // OTP correct — create the user account
    await db.emailOtp.delete({ where: { id: record.id } });

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "An account with this email already exists. Please sign in." };
    }

    const user = await db.user.create({
      data: {
        name:           record.name,
        email,
        hashedPassword: record.password,
        emailVerified:  new Date(), // mark as verified
        role: email === SUPER_ADMIN_EMAIL ? UserRole.SUPER_ADMIN : UserRole.USER,
      },
    });

    await db.aICredit.create({ data: { userId: user.id, credits: 50 } });
    await db.subscription.create({ data: { userId: user.id, plan: "FREE" } });

    return { success: "Account created! You can now sign in." };
  } catch (error) {
    console.error("verifyOtpAndRegister error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Resend OTP (refresh) ──────────────────────────────────
export async function resendOtp(email: string) {
  try {
    const record = await db.emailOtp.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    if (!record) return { error: "No pending registration found. Please start over." };

    const newCode    = generateOtp();
    const expiresAt  = new Date(Date.now() + 10 * 60 * 1000);

    await db.emailOtp.update({
      where: { id: record.id },
      data:  { code: newCode, expiresAt, attempts: 0 },
    });

    const result = await sendEmail({
      to: email,
      subject: "Your New InterviewVault AI Verification Code",
      html: buildOtpEmail(record.name, newCode),
      code: newCode,
    });

    if (!result.success) {
      return { error: result.error ?? "Failed to send email. Please try again." };
    }

    return {
      success: true,
      devNote: result.devNote,
    };
  } catch (error) {
    console.error("[OTP] resendOtp unexpected error:", error);
    return { error: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// ── Email HTML template ───────────────────────────────────
// ── Email HTML template ───────────────────────────────────
function buildOtpEmail(name: string, code: string, actualEmailInDev?: string): string {
  const devBanner = actualEmailInDev
    ? `<div style="background:#1c1c27;border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#fbbf24;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⚠ DEV MODE</p>
        <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">This code is intended for: <strong style="color:#fafafa;">${actualEmailInDev}</strong></p>
       </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;max-width:480px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">✦</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">InterviewVault AI</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              ${devBanner}
              <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email Verification</p>
              <h2 style="margin:0 0 16px;color:#fafafa;font-size:20px;font-weight:700;">Hi ${name}, verify your email</h2>
              <p style="margin:0 0 28px;color:#a1a1aa;font-size:14px;line-height:1.6;">
                Enter the verification code below to complete your account setup. This code expires in <strong style="color:#fafafa;">10 minutes</strong>.
              </p>
              <!-- OTP box -->
              <div style="background:#09090b;border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Your code</p>
                <div style="font-size:40px;font-weight:800;color:#818cf8;letter-spacing:10px;font-family:'Courier New',monospace;">${code}</div>
              </div>
              <p style="margin:0;color:#71717a;font-size:13px;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Your account will not be created.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;color:#52525b;font-size:12px;">© 2025 InterviewVault AI. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

