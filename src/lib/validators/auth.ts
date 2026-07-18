import { z } from "zod";

// Known disposable/throwaway email providers to block
const BLOCKED_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
  "spam4.me", "trashmail.com", "trashmail.me", "trashmail.net",
  "dispostable.com", "maildrop.cc", "fakeinbox.com", "tempr.email",
  "10minutemail.com", "10minutemail.net", "discard.email", "mailnull.com",
  "spamgourmet.com", "trashmail.at", "tempemail.net", "tempinbox.com",
  "mailtemp.info", "spamspot.com", "dispostable.email",
];

// Validates that an email looks real (not purely random characters)
function looksLikeRealEmail(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;

  // Domain must have at least one dot and a TLD of 2+ chars
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;

  // Block known disposable providers
  if (BLOCKED_DOMAINS.includes(domain.toLowerCase())) return false;

  // Local part must be at least 2 chars and not purely numeric
  if (local.length < 2) return false;
  if (/^\d+$/.test(local)) return false;

  // Reject if local part looks like a random hash (>18 chars of hex)
  if (/^[a-f0-9]{18,}$/i.test(local)) return false;

  return true;
}

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens and apostrophes"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email address is too long")
    .refine(looksLikeRealEmail, {
      message: "Please use a real email address. Disposable or randomly-generated emails are not allowed.",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character (e.g. !@#$%)")
  ,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

