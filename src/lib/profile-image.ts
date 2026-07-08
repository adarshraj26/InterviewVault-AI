/**
 * profile-image.ts
 * ─────────────────────────────────────────────────────────────────
 * Centralised priority resolution for user profile pictures.
 *
 * Priority chain (highest → lowest):
 *   1. Custom uploaded photo  (avatarType === "CUSTOM_UPLOAD")
 *   2. Selected avatar        (avatarType === "AVATAR_LIBRARY")
 *   3. Google profile picture (googleImageUrl)
 *   4. Default avatar         (/avatars/default.svg)
 * ─────────────────────────────────────────────────────────────────
 */

export const DEFAULT_AVATAR_URL = "/avatars/default.svg";

// DiceBear v9 — avataaars style (great variety, professional look)
const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

// ── Avatar category → DiceBear style mapping ──────────────────────
export const AVATAR_CATEGORIES = [
  { id: "male",         label: "Male",         style: "avataaars",   seeds: ["Felix","Liam","Noah","Ethan","Oliver","James","Lucas","Mason","Aiden","Carter","Logan","Elijah"] },
  { id: "female",       label: "Female",       style: "avataaars",   seeds: ["Emma","Sophia","Ava","Mia","Isabelle","Chloe","Luna","Layla","Zoe","Nora","Lily","Hannah"] },
  { id: "professional", label: "Professional", style: "lorelei",     seeds: ["Alex","Jordan","Morgan","Casey","Riley","Quinn","Blake","Avery","Taylor","Cameron","Drew","Parker"] },
  { id: "cartoon",      label: "Cartoon",      style: "fun-emoji",   seeds: ["Bobo","Coco","Dodo","Fifi","Gigi","Jojo","Koko","Lolo","Momo","Nono","Popo","Roro"] },
  { id: "anime",        label: "Anime",        style: "adventurer",  seeds: ["Sakura","Hinata","Naruto","Yuki","Rin","Len","Miku","Kaito","Gumi","Meiko","Luka","Neru"] },
  { id: "developer",    label: "Developer",    style: "personas",    seeds: ["Dev01","Dev02","Dev03","Dev04","Dev05","Dev06","Dev07","Dev08","Dev09","Dev10","Dev11","Dev12"] },
  { id: "pixelart",     label: "Pixel Art",    style: "pixel-art",   seeds: ["Pixel1","Pixel2","Pixel3","Pixel4","Pixel5","Pixel6","Pixel7","Pixel8","Pixel9","Pixel10","Pixel11","Pixel12"] },
  { id: "robots",       label: "Robots",       style: "bottts",      seeds: ["R2D2","C3PO","HAL","WALL-E","Bender","Marvin","Data","JARVIS","Optimus","Ultron","Vision","Baymax"] },
  { id: "minimal",      label: "Minimal",      style: "initials",    seeds: ["AA","BB","CC","DD","EE","FF","GG","HH","II","JJ","KK","LL"] },
  { id: "abstract",     label: "Abstract",     style: "shapes",      seeds: ["Shape1","Shape2","Shape3","Shape4","Shape5","Shape6","Shape7","Shape8","Shape9","Shape10","Shape11","Shape12"] },
] as const;

export type AvatarCategoryId = (typeof AVATAR_CATEGORIES)[number]["id"];

/**
 * Build the full URL for a DiceBear avatar given a composite seed string.
 * The seed encodes both the style and the seed value: "style::seed"
 */
export function getAvatarUrl(compositeId: string): string {
  const [style, seed] = compositeId.includes("::") ? compositeId.split("::") : ["avataaars", compositeId];
  return `${DICEBEAR_BASE}/${style}/svg?seed=${encodeURIComponent(seed)}&size=200`;
}

/**
 * Build a composite avatar ID from a DiceBear style and seed.
 */
export function buildAvatarId(style: string, seed: string): string {
  return `${style}::${seed}`;
}

/**
 * Core priority resolution function.
 * Pass any user-like object with the relevant fields and get back a displayable URL.
 */
export function resolveProfileImage(user: {
  avatarType?: string | null;
  profileImageUrl?: string | null;
  selectedAvatarId?: string | null;
  googleImageUrl?: string | null;
  image?: string | null; // NextAuth session fallback
} | null | undefined): string {
  if (!user) return DEFAULT_AVATAR_URL;

  // 1. Custom uploaded photo
  if (user.avatarType === "CUSTOM_UPLOAD" && user.profileImageUrl) {
    return user.profileImageUrl;
  }

  // 2. Selected avatar from library
  if (user.avatarType === "AVATAR_LIBRARY" && user.selectedAvatarId) {
    return getAvatarUrl(user.selectedAvatarId);
  }

  // 3. Google profile picture
  if (user.googleImageUrl) return user.googleImageUrl;

  // 4. Legacy NextAuth image field (catches any edge cases)
  if (user.image && !user.image.startsWith("data:")) return user.image;

  // 5. Absolute fallback
  return DEFAULT_AVATAR_URL;
}
