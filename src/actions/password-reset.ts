"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/mail";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateOtp(): string {
  // Cryptographically random 6-digit number
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

// ── Send password reset OTP ───────────────────────────────
export async function sendPasswordResetOtp(email: string) {
  try {
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) return { error: "Invalid email address" };

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, hashedPassword: true },
    });

    // Don't reveal whether the email exists (anti-enumeration)
    if (!user || !user.hashedPassword) {
      return { success: true }; // Silently succeed for non-credential accounts
    }

    // Delete any previous reset OTP for this email
    await db.passwordResetOtp.deleteMany({ where: { email } });

    const code      = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await db.passwordResetOtp.create({
      data: { email, code, expiresAt },
    });

    // Send email
    const result = await sendEmail({
      to: email,
      subject: "Reset Your InterviewVault AI Password",
      html: buildResetEmail(user.name ?? "there", code),
      code,
    });

    if (!result.success) {
      await db.passwordResetOtp.deleteMany({ where: { email } });
      return { error: result.error ?? "Failed to send reset email. Please try again." };
    }

    return {
      success: true,
      devNote: result.devNote,
    };
  } catch (error) {
    console.error("[PASSWORD_RESET] sendPasswordResetOtp error:", error);
    return { error: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// ── Resend reset OTP ──────────────────────────────────────
export async function resendPasswordResetOtp(email: string) {
  try {
    const record = await db.passwordResetOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return { error: "No reset request found. Please start over." };

    const code      = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await db.passwordResetOtp.update({
      where: { id: record.id },
      data:  { code, expiresAt, attempts: 0 },
    });

    const user = await db.user.findUnique({ where: { email }, select: { name: true } });

    const result = await sendEmail({
      to: email,
      subject: "Your New InterviewVault AI Password Reset Code",
      html: buildResetEmail(user?.name ?? "there", code),
      code,
    });

    if (!result.success) return { error: result.error ?? "Failed to send email. Please try again." };

    return {
      success: true,
      devNote: result.devNote,
    };
  } catch (error) {
    console.error("[PASSWORD_RESET] resendPasswordResetOtp error:", error);
    return { error: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// ── Verify OTP only (for multi-step UI) ───────────────────
export async function verifyPasswordResetOtp(email: string, code: string) {
  try {
    const record = await db.passwordResetOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return { error: "No reset request found. Please start over." };

    if (new Date() > record.expiresAt) {
      await db.passwordResetOtp.delete({ where: { id: record.id } });
      return { error: "Code has expired. Please request a new one." };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await db.passwordResetOtp.delete({ where: { id: record.id } });
      return { error: "Too many attempts. Please request a new code." };
    }

    if (record.code !== code.trim()) {
      await db.passwordResetOtp.update({
        where: { id: record.id },
        data:  { attempts: record.attempts + 1 },
      });
      const remaining = MAX_ATTEMPTS - (record.attempts + 1);
      return { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
    }

    // Don't delete yet — keep for the final step to confirm ownership
    return { success: true };
  } catch (error) {
    console.error("[PASSWORD_RESET] verifyPasswordResetOtp error:", error);
    return { error: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// ── Final step: change password ────────────────────────────
const newPasswordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/\d/)
  .regex(/[^A-Za-z0-9]/);

export async function changePasswordAfterReset(
  email: string,
  code: string,
  newPassword: string
) {
  try {
    const passwordOk = newPasswordSchema.safeParse(newPassword);
    if (!passwordOk.success) {
      return { error: "Password does not meet requirements." };
    }

    // Re-verify OTP one final time
    const record = await db.passwordResetOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.code !== code.trim() || new Date() > record.expiresAt) {
      return { error: "Invalid or expired code. Please start over." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { email },
      data:  { hashedPassword },
    });

    // Clean up OTP record
    await db.passwordResetOtp.delete({ where: { id: record.id } });

    return { success: "Password changed successfully! You can now sign in." };
  } catch (error) {
    console.error("[PASSWORD_RESET] changePasswordAfterReset error:", error);
    return { error: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// ── Email HTML template ───────────────────────────────────
function buildResetEmail(name: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;max-width:480px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444,#8b5cf6);padding:32px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">🔐</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">InterviewVault AI</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Password Reset</p>
              <h2 style="margin:0 0 16px;color:#fafafa;font-size:20px;font-weight:700;">Hi ${name}, reset your password</h2>
              <p style="margin:0 0 28px;color:#a1a1aa;font-size:14px;line-height:1.6;">
                Use this code to reset your password. It expires in <strong style="color:#fafafa;">10 minutes</strong>.
              </p>
              <div style="background:#09090b;border:1px solid rgba(239,68,68,0.3);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Reset code</p>
                <div style="font-size:40px;font-weight:800;color:#f87171;letter-spacing:10px;font-family:'Courier New',monospace;">${code}</div>
              </div>
              <p style="margin:0;color:#71717a;font-size:13px;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
              </p>
            </td>
          </tr>
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
