"use client";

import Image from "next/image";
import { resolveProfileImage } from "@/lib/profile-image";
import { cn } from "@/lib/utils";

// Matches the fields that come back from the DB or session
export interface UserAvatarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  profileImageUrl?: string | null;
  googleImageUrl?: string | null;
  selectedAvatarId?: string | null;
  avatarType?: string | null;
}

const sizeMap = {
  xs:  { container: "h-7 w-7",   text: "text-[10px]", img: 28  },
  sm:  { container: "h-9 w-9",   text: "text-xs",     img: 36  },
  md:  { container: "h-12 w-12", text: "text-sm",     img: 48  },
  lg:  { container: "h-16 w-16", text: "text-lg",     img: 64  },
  xl:  { container: "h-24 w-24", text: "text-2xl",    img: 96  },
  "2xl": { container: "h-32 w-32", text: "text-3xl",  img: 128 },
} as const;

type AvatarSize = keyof typeof sizeMap;

interface UserAvatarProps {
  user?: UserAvatarUser | null;
  size?: AvatarSize;
  className?: string;
  /** When true, shows a subtle ring that matches the primary colour */
  ring?: boolean;
}

/**
 * UserAvatar
 * ───────────────────────────────────────────────────────────────
 * The single source of truth for rendering a user's avatar everywhere
 * in the application.  Uses the priority resolution chain:
 *   1. Custom uploaded photo
 *   2. Selected avatar from library (DiceBear)
 *   3. Google profile picture
 *   4. Default avatar (/avatars/default.svg) or initials fallback
 */
export function UserAvatar({ user, size = "sm", className, ring = false }: UserAvatarProps) {
  const { container, text, img } = sizeMap[size];
  const imageUrl = resolveProfileImage(user ?? null);
  const isDefault = imageUrl === "/avatars/default.svg";

  // Generate initials from name or email as ultimate fallback
  const getInitials = () => {
    const src = user?.name || user?.email || "?";
    return src
      .split(/[\s@]+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const baseClasses = cn(
    "relative rounded-xl overflow-hidden shrink-0 flex items-center justify-center",
    container,
    ring && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
    className
  );

  if (isDefault) {
    // Show gradient initials bubble as the default state
    return (
      <div className={cn(baseClasses, "gradient-bg text-white font-bold select-none", text)}>
        {getInitials()}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={user?.name || "User avatar"}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={(e) => {
          // On load error, fall back to initials
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.classList.add("gradient-bg", "text-white", "font-bold", text);
            parent.textContent = getInitials();
          }
        }}
      />
    </div>

  );
}
