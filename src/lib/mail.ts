import { Resend } from "resend";
import nodemailer from "nodemailer";

const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

// Optional SMTP transporter if configured in .env (e.g. Gmail App Password or custom SMTP)
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT ?? 587);

const smtpTransporter =
  smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  code?: string;
}

export interface SendMailResult {
  success: boolean;
  error?: string;
  devNote?: string;
}

export async function sendEmail({ to, subject, html, code }: SendMailParams): Promise<SendMailResult> {
  // Always log code to terminal for easy dev verification & debugging
  if (code) {
    console.log(`\n==================================================`);
    console.log(`[OTP VERIFICATION CODE]`);
    console.log(`Recipient: ${to}`);
    console.log(`Code     : ${code}`);
    console.log(`Subject  : ${subject}`);
    console.log(`==================================================\n`);
  }

  // Strategy 1: Use Nodemailer SMTP if configured
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: `"InterviewVault AI" <${smtpUser}>`,
        to,
        subject,
        html,
      });
      console.log(`[MAILER] Sent email via SMTP to ${to}`);
      return { success: true };
    } catch (err) {
      console.error("[MAILER] SMTP error:", err);
    }
  }

  // Strategy 2: Use Resend API
  if (resend) {
    try {
      // Must use onboarding@resend.dev for Resend free tier unless custom domain is verified
      const fromAddress = process.env.RESEND_FROM ?? "InterviewVault AI <onboarding@resend.dev>";
      
      const { data, error: sendError } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html,
      });

      if (sendError) {
        console.error("[MAILER] Resend API error:", JSON.stringify(sendError, null, 2));
      } else {
        console.log(`[MAILER] Sent email via Resend to ${to} (ID: ${data?.id})`);
        return { success: true };
      }
    } catch (err) {
      console.error("[MAILER] Resend exception:", err);
    }
  }

  // If email sending was unsuccessful (e.g. Resend free sandbox limit for non-owner recipients):
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    return {
      success: true,
      devNote: `Email sandbox limit active — check server terminal console for code (${code}).`,
    };
  }

  return {
    success: false,
    error: "Failed to deliver email. Please check your address or try again later.",
  };
}
